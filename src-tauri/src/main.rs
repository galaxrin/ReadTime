#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod store;

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use store::{BookRecord, BookStore};

const BOSS_KEY: &str = "CommandOrControl+Shift+H";
const CURSOR_PADDING: f64 = 8.0;
const MIN_WIDTH: f64 = 180.0;
const MIN_HEIGHT: f64 = 64.0;
const SNAP_THRESHOLD: f64 = 12.0;
const FONT_EXTENSIONS: [&str; 4] = ["otf", "ttf", "woff", "woff2"];

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
struct WindowGeometry {
    monitor: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

struct Stores {
    books: BookStore,
    fonts_dir: PathBuf,
    geometry_path: PathBuf,
    boss_key: Mutex<String>,
}

fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

fn hide_window(app: &AppHandle) {
    if let Some(window) = main_window(app) {
        if window.is_visible().unwrap_or(false) {
            let _ = window.emit("window:hidden", ());
            let _ = window.hide();
        }
    }
}

fn show_window(app: &AppHandle, reveal: bool) {
    if let Some(window) = main_window(app) {
        if reveal {
            let _ = window.emit("window:reveal", ());
        }
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn toggle_window(app: &AppHandle, reveal: bool) {
    match main_window(app) {
        Some(window) if window.is_visible().unwrap_or(false) => hide_window(app),
        Some(_) => show_window(app, reveal),
        None => {}
    }
}

#[tauri::command]
async fn book_import(
    stores: tauri::State<'_, Stores>,
    source_path: String,
) -> Result<BookRecord, String> {
    stores.books.import_book(Path::new(&source_path))
}

#[tauri::command]
async fn book_list(stores: tauri::State<'_, Stores>) -> Result<Vec<BookRecord>, String> {
    stores.books.list_books()
}

#[tauri::command]
async fn book_meta(stores: tauri::State<'_, Stores>, id: String) -> Result<BookRecord, String> {
    stores.books.book_meta(&id)
}

#[tauri::command]
async fn book_data(
    stores: tauri::State<'_, Stores>,
    id: String,
) -> Result<tauri::ipc::Response, String> {
    Ok(tauri::ipc::Response::new(stores.books.read_bytes(&id)?))
}

#[tauri::command]
async fn book_touch(stores: tauri::State<'_, Stores>, id: String) -> Result<(), String> {
    stores.books.touch_book(&id)
}

#[tauri::command]
async fn book_remove(stores: tauri::State<'_, Stores>, id: String) -> Result<(), String> {
    stores.books.remove_book(&id)
}

fn is_font_file(name: &str) -> bool {
    Path::new(name)
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| FONT_EXTENSIONS.contains(&value.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn list_font_files(stores: &Stores) -> Result<Vec<(String, PathBuf)>, String> {
    let _ = std::fs::create_dir_all(&stores.fonts_dir);
    let mut fonts = Vec::new();
    for entry in std::fs::read_dir(&stores.fonts_dir)
        .map_err(|error| error.to_string())?
        .flatten()
    {
        let path = entry.path();
        let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if !is_font_file(file_name) {
            continue;
        }
        let name = path
            .file_stem()
            .map(|value| value.to_string_lossy().into_owned())
            .unwrap_or_default();
        fonts.push((name, path));
    }
    Ok(fonts)
}

#[tauri::command]
async fn font_list(stores: tauri::State<'_, Stores>) -> Result<Vec<String>, String> {
    let mut names: Vec<String> = list_font_files(&stores)?
        .into_iter()
        .map(|(name, _)| name)
        .collect();
    names.sort();
    Ok(names)
}

#[tauri::command]
async fn font_read(
    stores: tauri::State<'_, Stores>,
    name: String,
) -> Result<tauri::ipc::Response, String> {
    let path = list_font_files(&stores)?
        .into_iter()
        .find(|(stem, _)| stem == &name)
        .map(|(_, path)| path)
        .ok_or_else(|| "字体不存在".to_string())?;
    let bytes = std::fs::read(path).map_err(|error| error.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
async fn font_import(stores: tauri::State<'_, Stores>, source_path: String) -> Result<String, String> {
    let source = Path::new(&source_path);
    let file_name = source
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "字体文件无效".to_string())?;
    if !is_font_file(file_name) {
        return Err("仅支持 OTF、TTF、WOFF 字体".into());
    }
    let _ = std::fs::create_dir_all(&stores.fonts_dir);
    std::fs::copy(source, stores.fonts_dir.join(file_name)).map_err(|error| error.to_string())?;
    Ok(Path::new(file_name)
        .file_stem()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_default())
}

// 窗口太小放不下设置面板时用它临时撑开，关掉面板再由前端还原
// macOS 上用 AppKit 自带的窗口动画插值，一次调用交给系统处理，避免逐帧 IPC 掉帧
#[cfg(target_os = "macos")]
fn set_frame_animated(window: &WebviewWindow, width: f64, height: f64) -> bool {
    use objc2::msg_send;
    use objc2::runtime::AnyObject;
    use objc2_foundation::NSRect;

    let Ok(ns_window) = window.ns_window() else { return false };
    let ns_window = ns_window as *mut AnyObject;
    unsafe {
        let frame: NSRect = msg_send![ns_window, frame];
        // AppKit 坐标原点在左下角：保持顶边不动，需要同步抬高底边
        let origin_y = frame.origin.y + frame.size.height - height;
        let target = NSRect::new(
            objc2_foundation::NSPoint::new(frame.origin.x, origin_y),
            objc2_foundation::NSSize::new(width, height),
        );
        let _: () = msg_send![ns_window, setFrame: target, display: true, animate: true];
    }
    true
}

#[tauri::command]
fn set_window_size_animated(window: WebviewWindow, width: f64, height: f64) -> bool {
    #[cfg(target_os = "macos")]
    {
        suppress_geometry_writes(900);
        if set_frame_animated(&window, width, height) {
            return true;
        }
    }
    set_window_size(window, width, height)
}

#[tauri::command]
fn set_window_size(window: WebviewWindow, width: f64, height: f64) -> bool {
    // 这次改动是给 UI 临时腾地方，别记进用户几何
    suppress_geometry_writes(900);
    let Ok(scale) = window.scale_factor() else { return false };
    let Ok(position) = window.outer_position() else { return false };
    let Some(monitor) = window.current_monitor().ok().flatten() else { return false };

    let area = monitor.work_area();
    let available_width = area.size.width as f64 / scale;
    let available_height = area.size.height as f64 / scale;
    let target_width = width.max(MIN_WIDTH).min(available_width);
    let target_height = height.max(MIN_HEIGHT).min(available_height);

    // 撑开后可能顶到屏幕边缘，把左上角夹回工作区
    let x = ((position.x - area.position.x) as f64 / scale)
        .clamp(0.0, (available_width - target_width).max(0.0));
    let y = ((position.y - area.position.y) as f64 / scale)
        .clamp(0.0, (available_height - target_height).max(0.0));

    if window
        .set_size(tauri::LogicalSize::new(target_width, target_height))
        .is_err()
    {
        return false;
    }
    window
        .set_position(tauri::PhysicalPosition::new(
            area.position.x + (x * scale).round() as i32,
            area.position.y + (y * scale).round() as i32,
        ))
        .is_ok()
}

#[tauri::command]
fn autostart_enabled(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|error| error.to_string())
}

#[tauri::command]
fn set_autostart(app: AppHandle, enabled: bool) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    if enabled {
        manager.enable()
    } else {
        manager.disable()
    }
    .map_err(|error| error.to_string())?;
    manager.is_enabled().map_err(|error| error.to_string())
}

fn cursor_inside(cursor: (f64, f64), origin: (f64, f64), size: (f64, f64)) -> bool {
    cursor.0 >= origin.0 - CURSOR_PADDING
        && cursor.0 <= origin.0 + size.0 + CURSOR_PADDING
        && cursor.1 >= origin.1 - CURSOR_PADDING
        && cursor.1 <= origin.1 + size.1 + CURSOR_PADDING
}

// tao 的 cursor_position 在 Retina 屏上把逻辑点当物理像素又乘了一次缩放比，结果整体偏移；
// 这里直接用 CoreGraphics 取全局逻辑坐标，和窗口的逻辑矩形比较
#[cfg(target_os = "macos")]
fn cursor_logical_position() -> Option<(f64, f64)> {
    use core_graphics::event::CGEvent;
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    let source = CGEventSource::new(CGEventSourceStateID::HIDSystemState).ok()?;
    let event = CGEvent::new(source).ok()?;
    let point = event.location();
    Some((point.x, point.y))
}

#[tauri::command]
async fn window_contains_cursor(window: WebviewWindow) -> Result<bool, String> {
    let origin = window.outer_position().map_err(|error| error.to_string())?;
    let size = window.outer_size().map_err(|error| error.to_string())?;
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let origin = (origin.x as f64 / scale, origin.y as f64 / scale);
    let size = (size.width as f64 / scale, size.height as f64 / scale);

    #[cfg(target_os = "macos")]
    let cursor = cursor_logical_position().ok_or_else(|| "无法获取光标位置".to_string())?;

    #[cfg(not(target_os = "macos"))]
    let cursor = {
        let cursor = window.cursor_position().map_err(|error| error.to_string())?;
        (cursor.x / scale, cursor.y / scale)
    };

    Ok(cursor_inside(cursor, origin, size))
}

#[tauri::command]
fn update_boss_key(
    app: AppHandle,
    stores: tauri::State<'_, Stores>,
    shortcut: String,
) -> bool {
    let current = stores
        .boss_key
        .lock()
        .map(|value| value.clone())
        .unwrap_or_default();
    if shortcut == current {
        return true;
    }
    let shortcuts = app.global_shortcut();
    if shortcuts.register(shortcut.as_str()).is_err() {
        return false;
    }
    if !current.is_empty() {
        // 旧键注销失败就说明两套键会同时生效，回滚本次注册并如实返回失败
        if shortcuts.unregister(current.as_str()).is_err() {
            let _ = shortcuts.unregister(shortcut.as_str());
            return false;
        }
    }
    if let Ok(mut state) = stores.boss_key.lock() {
        *state = shortcut;
    }
    true
}

// macOS 用模板图跟随菜单栏明暗；Windows 没有模板机制，深色位图在深色任务栏上看不清，改用彩色图
#[cfg(target_os = "macos")]
const TRAY_ICON: &[u8] = include_bytes!("../../assets/tray/trayTemplate@2x.png");
#[cfg(not(target_os = "macos"))]
const TRAY_ICON: &[u8] = include_bytes!("../../assets/tray/tray-color-32.png");

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let settings = MenuItem::with_id(app, "settings", "阅读设置", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出 ReadTime", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings, &quit])?;

    TrayIconBuilder::with_id("readtime-tray")
        .icon(Image::from_bytes(TRAY_ICON)?)
        .icon_as_template(cfg!(target_os = "macos"))
        .tooltip("ReadTime")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "settings" => {
                show_window(app, true);
                let _ = app.emit("open-settings", ());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle(), false);
            }
        })
        .build(app)?;
    Ok(())
}

// 保存的坐标可能与当前显示器脱节（拔掉外接屏后窗口跑到看不见的地方），只有与某块屏幕重叠足够多才采用
fn monitor_fingerprint(monitor: &tauri::Monitor) -> String {
    let area = monitor.work_area();
    format!(
        "{}|{}x{}@{}x{}",
        monitor.name().map(|name| name.as_str()).unwrap_or(""),
        area.position.x,
        area.position.y,
        area.size.width,
        area.size.height
    )
}

fn read_geometry(path: &Path) -> Option<WindowGeometry> {
    let geometry: WindowGeometry = serde_json::from_str(&std::fs::read_to_string(path).ok()?).ok()?;
    (geometry.width >= MIN_WIDTH && geometry.height >= MIN_HEIGHT).then_some(geometry)
}

// 偏移量记录的是相对所在屏幕工作区的逻辑坐标，换到缩放比不同的屏幕上仍能落在同一处；
// 保存的屏幕不在了就退回主屏并把偏移夹进工作区，窗口不会跑到看不见的地方
fn apply_geometry(window: &WebviewWindow, geometry: &WindowGeometry) -> bool {
    let monitors = window.available_monitors().unwrap_or_default();
    let saved = monitors
        .iter()
        .find(|monitor| !geometry.monitor.is_empty() && monitor_fingerprint(monitor) == geometry.monitor)
        // 兼容旧格式：那时只记了显示器名字
        .or_else(|| {
            monitors.iter().find(|monitor| {
                let name = monitor.name().map(|name| name.as_str()).unwrap_or("");
                !geometry.monitor.is_empty() && !geometry.monitor.contains('|') && name == geometry.monitor
            })
        });
    let fallback = window.primary_monitor().ok().flatten();
    let Some(monitor) = saved.or(fallback.as_ref()).or_else(|| monitors.first()) else {
        return false;
    };

    let scale = monitor.scale_factor();
    let area = monitor.work_area();
    let available_width = area.size.width as f64 / scale;
    let available_height = area.size.height as f64 / scale;
    let width = geometry.width.min(available_width).max(MIN_WIDTH);
    let height = geometry.height.min(available_height).max(MIN_HEIGHT);
    let x = geometry.x.clamp(0.0, (available_width - width).max(0.0));
    let y = geometry.y.clamp(0.0, (available_height - height).max(0.0));

    let physical_width = (width * scale).round() as u32;
    let physical_height = (height * scale).round() as u32;
    if window.set_size(tauri::PhysicalSize::new(physical_width, physical_height)).is_err() {
        return false;
    }
    window
        .set_position(tauri::PhysicalPosition::new(
            area.position.x + (x * scale).round() as i32,
            area.position.y + (y * scale).round() as i32,
        ))
        .is_ok()
}

// 单轴吸附：靠近工作区起止边时贴齐，否则保持原位
fn snap_axis(value: i32, near_start: i32, near_end: i32, threshold: i32) -> i32 {
    if (value - near_start).abs() <= threshold {
        near_start
    } else if (value - near_end).abs() <= threshold {
        near_end
    } else {
        value
    }
}

// 拖动结束后吸附到最近的屏幕边缘，并直接按吸附后的坐标记录（Tauri 的 set 之后立刻 read 不可靠）
fn capture_snapped_geometry(window: &WebviewWindow) -> Option<WindowGeometry> {
    let scale = window.scale_factor().ok()?;
    let position = window.outer_position().ok()?;
    let size = window.outer_size().ok()?;
    let monitor = window.current_monitor().ok().flatten()?;
    let area = monitor.work_area();

    let threshold = (SNAP_THRESHOLD * scale).round() as i32;
    let left = area.position.x;
    let top = area.position.y;
    let right = left + area.size.width as i32 - size.width as i32;
    let bottom = top + area.size.height as i32 - size.height as i32;
    if right <= left || bottom <= top {
        return None;
    }

    let x = snap_axis(position.x, left, right, threshold);
    let y = snap_axis(position.y, top, bottom, threshold);
    if x != position.x || y != position.y {
        let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
    }

    Some(WindowGeometry {
        monitor: monitor_fingerprint(&monitor),
        x: (x - area.position.x) as f64 / scale,
        y: (y - area.position.y) as f64 / scale,
        width: size.width as f64 / scale,
        height: size.height as f64 / scale,
    })
}

fn save_geometry(app: &AppHandle) {
    if now_millis() < GEOMETRY_SUPPRESS_UNTIL.load(Ordering::SeqCst) {
        return;
    }
    let Some(stores) = app.try_state::<Stores>() else { return };
    let Some(window) = main_window(app) else { return };
    let Some(geometry) = capture_snapped_geometry(&window) else { return };
    let Ok(json) = serde_json::to_string(&geometry) else { return };
    let temporary = stores
        .geometry_path
        .with_extension(format!("{}.tmp", uuid::Uuid::new_v4()));
    if std::fs::write(&temporary, json).is_ok() {
        let _ = std::fs::rename(&temporary, &stores.geometry_path);
    }
}

// 拖动和缩放会连发事件，等窗口静止 300ms 才落盘，避免丢掉最后一次变更
static GEOMETRY_EPOCH: AtomicU64 = AtomicU64::new(0);
// 临时改窗口尺寸（比如给设置面板腾地方）期间不要让 Resized 落盘，否则用户真实几何会被覆盖
static GEOMETRY_SUPPRESS_UNTIL: AtomicU64 = AtomicU64::new(0);

fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as u64)
        .unwrap_or(0)
}

fn suppress_geometry_writes(ms: u64) {
    GEOMETRY_SUPPRESS_UNTIL.store(now_millis().saturating_add(ms), Ordering::SeqCst);
}
static GEOMETRY_WORKER_BUSY: AtomicBool = AtomicBool::new(false);

fn save_geometry_debounced(app: &AppHandle) {
    let epoch = GEOMETRY_EPOCH.fetch_add(1, Ordering::SeqCst) + 1;
    // 已经有一个线程在等静止，它自己会读到最新 epoch，不必再开线程
    if GEOMETRY_WORKER_BUSY.swap(true, Ordering::SeqCst) {
        return;
    }
    let handle = app.clone();
    std::thread::spawn(move || {
        let mut last = epoch;
        loop {
            std::thread::sleep(Duration::from_millis(300));
            let current = GEOMETRY_EPOCH.load(Ordering::SeqCst);
            if current == last {
                save_geometry(&handle);
                GEOMETRY_WORKER_BUSY.store(false, Ordering::SeqCst);
                break;
            }
            last = current;
        }
    });
}

fn position_window(app: &tauri::App) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    window.set_content_protected(true)?;
    window.set_min_size(Some(tauri::LogicalSize::new(MIN_WIDTH, MIN_HEIGHT)))?;

    let geometry_path = app.state::<Stores>().geometry_path.clone();
    if let Some(geometry) = read_geometry(&geometry_path) {
        if apply_geometry(&window, &geometry) {
            return Ok(());
        }
    }

    let geometry = default_geometry(&window);
    apply_geometry(&window, &geometry);
    Ok(())
}

// 首次启动贴右上角，坐标同样相对工作区，和恢复路径共用一套换算
fn default_geometry(window: &WebviewWindow) -> WindowGeometry {
    let monitor = window.current_monitor().ok().flatten();
    let scale = window.scale_factor().unwrap_or(1.0);
    let available = monitor
        .as_ref()
        .map(|monitor| monitor.work_area().size.width as f64 / scale)
        .unwrap_or(1728.0);
    WindowGeometry {
        monitor: monitor.and_then(|monitor| monitor.name().cloned()).unwrap_or_default(),
        x: (available - 420.0).max(0.0),
        y: 0.0,
        width: 400.0,
        height: 600.0,
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_window(app, false);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            book_import,
            book_list,
            book_meta,
            book_data,
            book_touch,
            book_remove,
            font_list,
            font_read,
            font_import,
            window_contains_cursor,
            autostart_enabled,
            set_autostart,
            set_window_size,
            set_window_size_animated,
            update_boss_key
        ])
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            app.manage(Stores {
                books: BookStore::new(&data_dir),
                fonts_dir: data_dir.join("fonts"),
                geometry_path: data_dir.join("window.json"),
                boss_key: Mutex::new(String::new()),
            });

            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            position_window(app)?;

            let handle = app.handle().clone();
            match handle.global_shortcut().register(BOSS_KEY) {
                Ok(_) => {
                    if let Some(stores) = handle.try_state::<Stores>() {
                        if let Ok(mut state) = stores.boss_key.lock() {
                            *state = BOSS_KEY.to_string();
                        }
                    }
                }
                Err(error) => eprintln!("Failed to register boss key: {error}"),
            }

            setup_tray(app)?;

            #[cfg(not(target_os = "macos"))]
            show_window(&handle, false);

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    hide_window(window.app_handle());
                }
                WindowEvent::Moved(_) | WindowEvent::Resized(_) => {
                    save_geometry_debounced(window.app_handle());
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;
    use tauri_plugin_global_shortcut::Shortcut;

    #[test]
    fn boss_key_string_parses() {
        assert!(Shortcut::from_str(super::BOSS_KEY).is_ok());
    }

    #[test]
    fn snap_axis_snaps_within_threshold_only() {
        let threshold = 12;
        // 距左边 8px → 贴左
        assert_eq!(super::snap_axis(1008, 1000, 1500, threshold), 1000);
        // 距右边 5px → 贴右
        assert_eq!(super::snap_axis(1495, 1000, 1500, threshold), 1500);
        // 中间位置不动
        assert_eq!(super::snap_axis(1200, 1000, 1500, threshold), 1200);
        // 超出阈值 13px 不吸附
        assert_eq!(super::snap_axis(1013, 1000, 1500, threshold), 1013);
    }

    #[test]
    fn cursor_inside_accounts_for_padding() {
        let origin = (1500.0, 30.0);
        let size = (400.0, 600.0);
        assert!(super::cursor_inside((1600.0, 300.0), origin, size));
        assert!(super::cursor_inside((1495.0, 25.0), origin, size));
        assert!(!super::cursor_inside((100.0, 300.0), origin, size));
        assert!(!super::cursor_inside((1600.0, 700.0), origin, size));
    }

    #[test]
    fn reads_valid_geometry() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("window.json");
        std::fs::write(&path, r#"{"monitor":"Built-in Retina Display","x":100.0,"y":50.0,"width":400.0,"height":600.0}"#).unwrap();
        assert_eq!(
            super::read_geometry(&path),
            Some(super::WindowGeometry {
                monitor: "Built-in Retina Display".into(),
                x: 100.0,
                y: 50.0,
                width: 400.0,
                height: 600.0
            })
        );
    }

    #[test]
    fn rejects_broken_geometry_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("window.json");
        std::fs::write(&path, "{ not json").unwrap();
        assert!(super::read_geometry(&path).is_none());

        std::fs::write(&path, r#"{"monitor":"x","x":10.0,"y":10.0,"width":0.0,"height":0.0}"#).unwrap();
        assert!(super::read_geometry(&path).is_none());
    }

    #[test]
    fn user_bound_shortcut_also_parses() {
        // 设置面板允许用户改绑，这些是捕获到的典型组合
        for shortcut in ["CommandOrControl+Alt+K", "Shift+F5"] {
            assert!(Shortcut::from_str(shortcut).is_ok(), "无法解析 {shortcut}");
        }
    }
}
