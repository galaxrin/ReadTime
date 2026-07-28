#!/bin/bash
# Fix the built HTML to work with Electron

# Get the JS filename
JS_FILE=$(ls dist/renderer/assets/main-*.js 2>/dev/null | head -1 | xargs basename)
CSS_FILE=$(ls dist/renderer/assets/main-*.css 2>/dev/null | head -1 | xargs basename)

if [ -z "$JS_FILE" ] || [ -z "$CSS_FILE" ]; then
  echo "Error: Build assets not found"
  exit 1
fi

echo "Found JS file: $JS_FILE"

# Create a new HTML file that loads JS as module at the end of body
cat > dist/renderer/index.html << EOF
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReadTime</title>
  <link rel="stylesheet" href="./assets/$CSS_FILE">
  <style>
    @font-face {
      font-family: "ReadTime Ma Shan Zheng";
      src: url("../../assets/fonts/MaShanZheng-Regular.ttf") format("truetype");
      font-display: swap;
    }
    @font-face {
      font-family: "ReadTime ZCOOL XiaoWei";
      src: url("../../assets/fonts/ZCOOLXiaoWei-Regular.ttf") format("truetype");
      font-display: swap;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      margin: 0;
      padding: 0;
    }

    #root {
      width: 100%;
      height: 100vh;
      background: transparent;
    }

    .draggable {
      -webkit-app-region: drag;
    }

    .non-draggable {
      -webkit-app-region: no-drag;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./assets/$JS_FILE"></script>
</body>
</html>
EOF

echo "Fixed HTML file"
