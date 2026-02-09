mod category;
mod commands;
mod detector;
mod parsers;
mod unified;

use clap::{Parser, Subcommand};
use commands::{convert, detect, import};

#[derive(Parser)]
#[command(name = "mirai-cli")]
#[command(about = "CSV conversion tool for mirai-kojin household finance app")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Convert bank/card CSV to unified format
    Convert {
        /// Input CSV file or directory
        input: String,
        /// Output CSV file or directory
        #[arg(short, long)]
        output: String,
        /// Financial institution (rakuten-bank, smbc, sbi, olive, rakuten-card, jcb)
        #[arg(short, long)]
        bank: Option<String>,
        /// Auto-detect institution and batch convert (when input is a directory)
        #[arg(long, default_value_t = false)]
        auto: bool,
    },
    /// Auto-detect financial institution from CSV file
    Detect {
        /// Input CSV file
        input: String,
    },
    /// Import CSV directly to API server
    Import {
        /// Input CSV file
        input: String,
        /// API server URL
        #[arg(long, default_value = "http://localhost:8080")]
        api_url: String,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Convert {
            input,
            output,
            bank,
            auto,
        } => convert::run(&input, &output, bank.as_deref(), auto),
        Commands::Detect { input } => detect::run(&input),
        Commands::Import { input, api_url } => import::run(&input, &api_url).await,
    }
}
