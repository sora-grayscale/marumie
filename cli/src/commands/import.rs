use crate::detector::detect_institution;
use crate::parsers;
use anyhow::{Context, Result};
use std::fs;

pub async fn run(input: &str, api_url: &str) -> Result<()> {
    let data = fs::read(input).with_context(|| format!("Failed to read: {}", input))?;

    let institution = detect_institution(&data)?;
    eprintln!("Detected institution: {}", institution);

    let transactions = parsers::parse(institution, &data)?;
    eprintln!("Parsed {} transactions.", transactions.len());

    let url = format!("{}/api/transactions/import", api_url.trim_end_matches('/'));
    eprintln!("Importing to {}...", url);

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .json(&transactions)
        .send()
        .await
        .with_context(|| format!("Failed to connect to API: {}", url))?;

    if response.status().is_success() {
        eprintln!("Import completed successfully.");
        Ok(())
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("API returned error {}: {}", status, body)
    }
}
