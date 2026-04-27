use std::process::Command;
use std::path::Path;


pub fn launch_and_wait(exe_path: &str) -> Result<i32, String> {
    let path = Path::new(exe_path);
    if !path.exists() {
        return Err("File thực thi không tồn tại!".to_string());
    }

    let dir = path.parent().ok_or("Không thể xác định thư mục làm việc")?;

    let mut child = Command::new(exe_path)
        .current_dir(dir)
        .spawn()
        .map_err(|e| format!("Lỗi khởi chạy game: {}", e))?;

    let status = child.wait()
        .map_err(|e| format!("Lỗi khi đợi game kết thúc: {}", e))?;

    Ok(status.code().unwrap_or(0))
}
