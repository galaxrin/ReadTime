use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BookRecord {
    pub id: String,
    pub title: String,
    pub format: String,
    pub stored_path: String,
    pub added_at: u64,
    pub last_read_at: u64,
}

pub struct BookStore {
    books_dir: PathBuf,
    metadata_path: PathBuf,
    // async 命令在运行时并发执行，read-modify-save 必须串行
    lock: Mutex<()>,
}

fn now_millis() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

impl BookStore {
    pub fn new(user_data: &Path) -> Self {
        let books_dir = user_data.join("books");
        let metadata_path = books_dir.join("books.json");
        Self { books_dir, metadata_path, lock: Mutex::new(()) }
    }

    fn is_valid(&self, book: &BookRecord) -> bool {
        matches!(book.format.as_str(), "txt" | "epub")
            && Path::new(&book.stored_path).parent() == Some(self.books_dir.as_path())
    }

    fn load(&self) -> Result<Vec<BookRecord>, String> {
        let raw = match fs::read_to_string(&self.metadata_path) {
            Ok(raw) => raw,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
            Err(_) => return Err("书架数据损坏，已保留原文件".into()),
        };
        let books: Vec<BookRecord> = serde_json::from_str(&raw)
            .map_err(|_| "书架数据损坏，已保留原文件".to_string())?;
        // 语法错误上面已经整库失败；个别记录不合法时跳过它，别让一条坏数据挡住整个书架
        Ok(books.into_iter().filter(|book| self.is_valid(book)).collect())
    }

    fn save(&self, books: &[BookRecord]) -> Result<(), String> {
        fs::create_dir_all(&self.books_dir).map_err(|error| error.to_string())?;
        let json = serde_json::to_string_pretty(books).map_err(|error| error.to_string())?;
        // tmp 名带唯一后缀，两个写操作交错也不会互相踩
        let temporary = self.metadata_path.with_extension(format!("{}.tmp", Uuid::new_v4()));
        fs::write(&temporary, json).map_err(|error| error.to_string())?;
        fs::rename(&temporary, &self.metadata_path).map_err(|error| error.to_string())
    }

    fn serialize<T>(&self, action: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
        let _guard = self.lock.lock().map_err(|_| "书架状态不可用".to_string())?;
        action()
    }

    pub fn import_book(&self, source_path: &Path) -> Result<BookRecord, String> {
        self.serialize(|| self.import_book_inner(source_path))
    }

    fn import_book_inner(&self, source_path: &Path) -> Result<BookRecord, String> {
        let extension = source_path
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| value.to_lowercase())
            .unwrap_or_default();
        if extension != "txt" && extension != "epub" {
            return Err("仅支持 TXT 和 EPUB 文件".into());
        }

        let mut books = self.load()?;
        fs::create_dir_all(&self.books_dir).map_err(|error| error.to_string())?;
        let id = Uuid::new_v4().to_string();
        let stored_path = self.books_dir.join(format!("{id}.{extension}"));
        fs::copy(source_path, &stored_path).map_err(|error| error.to_string())?;
        let now = now_millis();
        let book = BookRecord {
            id,
            title: source_path
                .file_stem()
                .and_then(|value| value.to_str())
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
                .unwrap_or_else(|| "未命名".to_string()),
            format: extension,
            stored_path: stored_path.to_string_lossy().into_owned(),
            added_at: now,
            last_read_at: now,
        };
        books.insert(0, book.clone());
        self.save(&books)?;
        Ok(book)
    }

    pub fn list_books(&self) -> Result<Vec<BookRecord>, String> {
        self.serialize(|| self.list_books_inner())
    }

    fn list_books_inner(&self) -> Result<Vec<BookRecord>, String> {
        let mut books = self.load()?;
        books.sort_by_key(|book| std::cmp::Reverse(book.last_read_at));
        Ok(books)
    }

    fn find(&self, id: &str) -> Result<BookRecord, String> {
        self.load()?
            .into_iter()
            .find(|book| book.id == id)
            .ok_or_else(|| "书籍文件不存在，请重新导入".to_string())
    }

    pub fn book_meta(&self, id: &str) -> Result<BookRecord, String> {
        self.serialize(|| self.find(id))
    }

    pub fn read_bytes(&self, id: &str) -> Result<Vec<u8>, String> {
        let book = self.serialize(|| self.find(id))?;
        fs::read(&book.stored_path).map_err(|_| "书籍文件不存在，请重新导入".to_string())
    }

    pub fn touch_book(&self, id: &str) -> Result<(), String> {
        self.serialize(|| self.touch_book_inner(id))
    }

    fn touch_book_inner(&self, id: &str) -> Result<(), String> {
        let mut books = self.load()?;
        let Some(index) = books.iter().position(|book| book.id == id) else {
            return Ok(());
        };
        let next = books
            .iter()
            .map(|item| item.last_read_at)
            .max()
            .unwrap_or(0)
            .saturating_add(1)
            .max(now_millis());
        books[index].last_read_at = next;
        self.save(&books)
    }

    pub fn remove_book(&self, id: &str) -> Result<(), String> {
        self.serialize(|| self.remove_book_inner(id))
    }

    fn remove_book_inner(&self, id: &str) -> Result<(), String> {
        let books = self.load()?;
        let Some(book) = books.iter().find(|book| book.id == id) else {
            return Ok(());
        };
        match fs::remove_file(&book.stored_path) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(format!("删除书籍文件失败：{error}")),
        }
        let remaining: Vec<BookRecord> =
            books.into_iter().filter(|item| item.id != id).collect();
        self.save(&remaining)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn store() -> (tempfile::TempDir, BookStore) {
        let dir = tempfile::tempdir().unwrap();
        let store = BookStore::new(dir.path());
        (dir, store)
    }

    fn write_source(dir: &Path, name: &str) -> PathBuf {
        let path = dir.join(name);
        fs::write(&path, "第一章 开始\n正文").unwrap();
        path
    }

    #[test]
    fn imports_and_reads_back_book() {
        let (dir, store) = store();
        let source = write_source(dir.path(), "测试书.txt");
        let book = store.import_book(&source).unwrap();

        assert_eq!(book.title, "测试书");
        assert_eq!(book.format, "txt");
        assert!(book.stored_path.starts_with(dir.path().join("books").to_str().unwrap()));

        let books = store.list_books().unwrap();
        assert_eq!(books.len(), 1);
        assert_eq!(store.read_bytes(&book.id).unwrap(), b"\xe7\xac\xac\xe4\xb8\x80\xe7\xab\xa0 \xe5\xbc\x80\xe5\xa7\x8b\n\xe6\xad\xa3\xe6\x96\x87".to_vec());
    }

    #[test]
    fn rejects_unsupported_extension() {
        let (dir, store) = store();
        let path = dir.path().join("坏文件.pdf");
        fs::write(&path, "x").unwrap();
        assert_eq!(store.import_book(&path).unwrap_err(), "仅支持 TXT 和 EPUB 文件");
    }

    #[test]
    fn touch_moves_book_to_top() {
        let (dir, store) = store();
        let first = store.import_book(&write_source(dir.path(), "a.txt")).unwrap();
        let second = store.import_book(&write_source(dir.path(), "b.txt")).unwrap();
        store.touch_book(&first.id).unwrap();

        let books = store.list_books().unwrap();
        assert_eq!(books[0].id, first.id);
        assert_eq!(books[1].id, second.id);
    }

    #[test]
    fn removes_book_and_file() {
        let (dir, store) = store();
        let book = store.import_book(&write_source(dir.path(), "删.txt")).unwrap();
        let stored = PathBuf::from(&book.stored_path);
        assert!(stored.exists());

        store.remove_book(&book.id).unwrap();
        assert!(!stored.exists());
        assert!(store.list_books().unwrap().is_empty());
    }

    #[test]
    fn skips_invalid_records_but_keeps_the_rest() {
        let dir = tempfile::tempdir().unwrap();
        let store = BookStore::new(dir.path());
        let source = dir.path().join("好.txt");
        std::fs::write(&source, "x").unwrap();
        let book = store.import_book(&source).unwrap();

        // 追加一条 storedPath 指向别处的坏记录
        let mut books: Vec<BookRecord> = serde_json::from_str(
            &std::fs::read_to_string(dir.path().join("books/books.json")).unwrap(),
        )
        .unwrap();
        let mut broken = books[0].clone();
        broken.id = "broken".into();
        broken.stored_path = "/tmp/elsewhere.txt".into();
        books.push(broken);
        std::fs::write(
            dir.path().join("books/books.json"),
            serde_json::to_string(&books).unwrap(),
        )
        .unwrap();

        let listed = store.list_books().unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].id, book.id);
    }

    #[test]
    fn concurrent_imports_do_not_lose_books() {
        let dir = tempfile::tempdir().unwrap();
        let store = std::sync::Arc::new(BookStore::new(dir.path()));
        let mut handles = Vec::new();
        for index in 0..8 {
            let store = store.clone();
            let path = dir.path().join(format!("并发{index}.txt"));
            std::fs::write(&path, "内容").unwrap();
            handles.push(std::thread::spawn(move || store.import_book(&path).unwrap()));
        }
        for handle in handles {
            handle.join().unwrap();
        }
        assert_eq!(store.list_books().unwrap().len(), 8);
    }

    #[test]
    fn reports_corrupted_metadata() {
        let (dir, store) = store();
        fs::create_dir_all(dir.path().join("books")).unwrap();
        fs::write(dir.path().join("books/books.json"), "{ not json").unwrap();
        assert_eq!(store.list_books().unwrap_err(), "书架数据损坏，已保留原文件");
    }
}
