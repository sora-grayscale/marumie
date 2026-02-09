use crate::detector::detect_institution;
use crate::parsers;
use crate::unified::{Institution, UnifiedTransaction, CSV_HEADERS};
use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

pub fn run(input: &str, output: &str, bank: Option<&str>, auto: bool) -> Result<()> {
    let input_path = Path::new(input);

    if input_path.is_dir() {
        convert_directory(input_path, Path::new(output), bank, auto)
    } else {
        convert_file(input_path, Path::new(output), bank, auto)
    }
}

fn convert_file(input: &Path, output: &Path, bank: Option<&str>, auto: bool) -> Result<()> {
    let data = fs::read(input).with_context(|| format!("Failed to read: {}", input.display()))?;

    let institution = if auto {
        detect_institution(&data)?
    } else if let Some(b) = bank {
        Institution::from_str(b).ok_or_else(|| {
            anyhow::anyhow!(
                "Unknown institution: '{}'. Use: rakuten-bank, smbc, sbi, olive, rakuten-card, jcb",
                b
            )
        })?
    } else {
        anyhow::bail!("Specify --bank <institution> or use --auto for auto-detection");
    };

    eprintln!("Parsing {} as {}...", input.display(), institution);

    let transactions = parsers::parse(institution, &data)?;

    eprintln!("Found {} transactions.", transactions.len());

    write_csv(output, &transactions)?;

    eprintln!("Output written to: {}", output.display());
    Ok(())
}

fn convert_directory(input: &Path, output: &Path, bank: Option<&str>, auto: bool) -> Result<()> {
    if !auto && bank.is_none() {
        anyhow::bail!("Directory conversion requires --auto or --bank");
    }

    fs::create_dir_all(output)?;

    let mut total = 0;
    for entry in fs::read_dir(input)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("csv") {
            continue;
        }

        let out_name = path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string()
            + "_unified.csv";
        let out_path = output.join(out_name);

        match convert_file(&path, &out_path, bank, auto) {
            Ok(()) => total += 1,
            Err(e) => eprintln!("Warning: skipping {}: {}", path.display(), e),
        }
    }

    eprintln!("Converted {} files.", total);
    Ok(())
}

fn write_csv(output: &Path, transactions: &[UnifiedTransaction]) -> Result<()> {
    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut writer = csv::Writer::from_path(output)?;

    writer.write_record(CSV_HEADERS)?;

    for tx in transactions {
        writer.write_record([
            &tx.date.format("%Y-%m-%d").to_string(),
            &tx.category,
            &tx.subcategory,
            &tx.amount.to_string(),
            &tx.transaction_type.to_string(),
            &tx.payment_method,
            &tx.description,
            &tx.memo,
            &tx.institution,
            &tx.account_type,
            &tx.hash,
        ])?;
    }

    writer.flush()?;
    Ok(())
}
