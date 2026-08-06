# AMFI Data Scraper and Database

This project scrapes historical Net Asset Value (NAV) data for Indian Mutual Funds from the Association of Mutual Funds in India (AMFI) website. The scraped data is then processed and stored in a SQLite database.

## Data Source

The data is fetched from the official AMFI website: [https://portal.amfiindia.com](https://portal.amfiindia.com)

A GitHub Actions workflow is set up to fetch the latest data every day at 19:00 UTC.

## Database Schema

The scraped data is stored in a SQLite database file named `funds.db`. The database contains the following tables:

*   **`scheme_data`**: Stores information about each mutual fund scheme.
    *   `scheme_code` (INTEGER, PRIMARY KEY): The unique code for the scheme.
    *   `scheme_name` (TEXT): The name of the scheme.

*   **`nav_data`**: Stores the daily Net Asset Value (NAV) for each scheme.
    *   `scheme_code` (INTEGER): Foreign key referencing `scheme_data.scheme_code`.
    *   `date` (DATE): The date of the NAV record.
    *   `nav` (FLOAT): The Net Asset Value for that date.

*   **`isin_data`**: Stores the ISIN (International Securities Identification Number) for each scheme.
    *   `scheme_code` (INTEGER): Foreign key referencing `scheme_data.scheme_code`.
    *   `isin_payout` (TEXT): The ISIN for the dividend payout/growth option.
    *   `isin_reinvestment` (TEXT): The ISIN for the dividend reinvestment option.

Indexes are created on the tables to ensure fast query performance.

## How to Use

### Prerequisites

*   Python 3.x
*   The `requests` library

### Setup

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repo-directory>
    ```

2.  Install the required Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### Execution

1.  **Fetch the data:**
    To download the historical data from the AMFI website, run the following command:
    ```bash
    python src/amfi/amfi_fetch.py
    ```
    This script will download the data into the `data` directory, organized by year, month, and day.

2.  **Process the data and create the database:**
    To parse the downloaded CSV files and populate the SQLite database, run:
    ```bash
    python src/amfi/amfi_data_process.py
    ```
    This will create a `funds.db` file in the root directory of the project.

## Automation

This repository uses GitHub Actions to automate the process of fetching and processing the data. The workflow is defined in `.github/workflows/amfi-data-update.yml` and runs on the following schedule:

*   Every day at 19:00 UTC.
*   On every push to the `master` branch.

The workflow performs the following steps:
1.  Fetches the latest data from the AMFI website.
2.  Processes the data and updates the `funds.db` database.
3.  Commits the new data files in the `data` directory.
4.  Creates a new GitHub release with the updated `funds.db.tar.gz` file.
