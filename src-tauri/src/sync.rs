use aws_sdk_s3::{Client as S3Client, config::Region};

use aws_sdk_s3::primitives::ByteStream;
use std::path::Path;
use std::fs::{self, File};
use std::io::{self, Read, Write};
use zip::{ZipWriter, write::FileOptions};
use walkdir::WalkDir;

pub struct CloudSync {
    client: S3Client,
    bucket: String,
}

impl CloudSync {
    pub async fn new(key_id: &str, app_key: &str, endpoint: &str, bucket: &str) -> Self {
        let region = endpoint.split('.').nth(1).unwrap_or("us-east-1");
        
        let config = aws_config::from_env()
            .region(Region::new(region.to_string()))
            .endpoint_url(format!("https://{}", endpoint))
            .credentials_provider(aws_sdk_s3::config::Credentials::new(
                key_id,
                app_key,
                None,
                None,
                "b2"
            ))
            .load()
            .await;

        let client = S3Client::new(&config);
        Self {
            client,
            bucket: bucket.to_string(),
        }
    }

    pub async fn upload(&self, local_zip_path: &Path, cloud_key: &str) -> Result<(), String> {
        let body = ByteStream::from_path(local_zip_path).await
            .map_err(|e| format!("Failed to read file: {}", e))?;

        self.client.put_object()
            .bucket(&self.bucket)
            .key(cloud_key)
            .body(body)
            .send()
            .await
            .map_err(|e| format!("B2 Upload Error: {}", e))?;

        Ok(())
    }

    pub async fn download(&self, cloud_key: &str, dest_path: &Path) -> Result<(), String> {
        let resp = self.client.get_object()
            .bucket(&self.bucket)
            .key(cloud_key)
            .send()
            .await
            .map_err(|e| format!("B2 Download Error: {}", e))?;

        let data = resp.body.collect().await
            .map_err(|e| format!("Failed to collect stream: {}", e))?;

        fs::write(dest_path, data.into_bytes())
            .map_err(|e| format!("FS Error: {}", e))?;

        Ok(())
    }
}

pub fn zip_folder(source: &Path, output: &Path) -> zip::result::ZipResult<()> {
    if !source.exists() {
        return Ok(());
    }

    let file = File::create(output)?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let mut buffer = Vec::new();
    for entry in WalkDir::new(source).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path.strip_prefix(Path::new(source)).unwrap();

        if path.is_file() {
            zip.start_file(name.to_string_lossy(), options)?;
            let mut f = File::open(path)?;
            f.read_to_end(&mut buffer)?;
            zip.write_all(&buffer)?;
            buffer.clear();
        } else if !name.as_os_str().is_empty() {
            zip.add_directory(name.to_string_lossy(), options)?;
        }
    }
    zip.finish()?;
    Ok(())
}

pub fn unzip_file(zip_path: &Path, dest: &Path) -> zip::result::ZipResult<()> {
    let file = File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = match file.enclosed_name() {
            Some(path) => dest.join(path),
            None => continue,
        };

        if (*file.name()).ends_with('/') {
            fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p)?;
                }
            }
            let mut outfile = File::create(&outpath)?;
            io::copy(&mut file, &mut outfile)?;
        }
    }
    Ok(())
}
