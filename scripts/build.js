const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');

// 判断 package 文件，并保证 release 文件夹存在
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir);
}

// 获取版本号
const extensionDir = path.join(rootDir, 'stay_focus_extension');
const manifestPath = path.join(extensionDir, 'manifest.json');
let version = 'unknown';
if (fs.existsSync(manifestPath)) {
  const manifest = require(manifestPath);
  version = manifest.version || 'unknown';
}

console.log('\x1b[34m%s\x1b[0m', `开始打包 Stay Focus 扩展 v${version}...`);

const outputZipPath = path.join(releaseDir, `stay_focus_v${version}.zip`);
const output = fs.createWriteStream(outputZipPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // 最大压缩级别
});

output.on('close', function() {
  console.log('\x1b[32m%s\x1b[0m', `\n✅ 打包成功！`);
  console.log('\x1b[32m%s\x1b[0m', `📦 交付物路径: ${outputZipPath}`);
  console.log('\x1b[32m%s\x1b[0m', `🗜️ 文件大小: ${(archive.pointer() / 1024).toFixed(2)} KB`);
  console.log('\x1b[36m%s\x1b[0m', `\n🚀 [Release Assets] 后续请将以下构建物一并附加到 GitHub Release 中：`);
  console.log('\x1b[36m%s\x1b[0m', `  - 浏览器扩展：${outputZipPath}`);
  console.log('\x1b[36m%s\x1b[0m', `  - 桌面客户端：stay_focus_desktop/dist/*.exe 和 *.7z 版本`);
});

archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('\x1b[33m%s\x1b[0m', '警告: ' + err.message);
  } else {
    throw err;
  }
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

console.log('添加文件到压缩包中...');

archive.glob('**/*', {
  cwd: extensionDir
});

archive.finalize();
