use crate::detector::detect_institution;
use anyhow::{Context, Result};
use std::fs;

pub fn run(input: &str) -> Result<()> {
    let data = fs::read(input).with_context(|| format!("Failed to read: {}", input))?;

    match detect_institution(&data) {
        Ok(institution) => {
            println!("Detected: {} ({})", institution, institution.encoding());
            Ok(())
        }
        Err(e) => {
            eprintln!("Detection failed: {}", e);
            Err(e)
        }
    }
}
