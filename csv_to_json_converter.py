#!/usr/bin/env python3
import csv
import json
import os
import sys
import glob # Import glob for file matching
from collections import defaultdict

# --- Unique delimiter for separating JSON outputs ---
JSON_DELIMITER = "---JSON_SEPARATOR---"

# --- Determine the script's directory and set relative paths ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, 'data') # Assumes 'data' directory is in the same dir as the script

# --- Approximate Exchange Rates (Update as needed) ---
EXCHANGE_RATES = {
    'USD': 1.0,
    'EUR': 1.1,  # 1 EUR = 1.1 USD
    'GBP': 1.25, # 1 GBP = 1.25 USD
    # Add other currencies if needed
}

# --- Helper function to clean CSV headers ---
def clean_dict_keys(row):
    return {key.strip(): value for key, value in row.items()}

# --- Helper function to parse price, handling commas ---
def parse_price(price_str):
    if not price_str:
        return 0.0
    try:
        # Remove commas before converting to float
        return float(str(price_str).replace(',', ''))
    except (ValueError, TypeError):
        return 0.0 # Return 0.0 if conversion fails

# --- Helper function to convert price to USD ---
def convert_to_usd(price, currency):
    currency_upper = currency.upper()
    rate = EXCHANGE_RATES.get(currency_upper, 1.0) # Default to 1.0 if currency not found
    if rate != 1.0:
        return round(price * rate, 2) # Convert and round to 2 decimal places
    return price # Return original price if already USD or rate not found

# --- Main processing logic ---
products_data = defaultdict(lambda: {'itemNo': None, 'description': None, 'manufacturer': None, 'brand': None, 'size': None, 'supplierOffers': []})
all_suppliers = set()

# Print status messages to stderr to avoid interfering with stdout JSON
print("Starting CSV processing...", file=sys.stderr)
sys.stderr.flush()

# Ensure data directory exists
print(f"DEBUG: Checking data directory: {DATA_DIR}", file=sys.stderr)
sys.stderr.flush()
try:
    if not os.path.isdir(DATA_DIR):
        print(f"ERROR: Data directory {DATA_DIR} not found.", file=sys.stderr)
        sys.exit(1)
    print(f"DEBUG: Data directory exists.", file=sys.stderr)
except Exception as e:
    print(f"ERROR: Failed to check data directory {DATA_DIR}: {e}", file=sys.stderr)
    sys.exit(1)
sys.stderr.flush()

# --- Dynamically find CSV files in the data directory ---
csv_files = glob.glob(os.path.join(DATA_DIR, '*.csv'))
print(f"DEBUG: Found CSV files: {csv_files}", file=sys.stderr)
sys.stderr.flush()

if not csv_files:
    print(f"ERROR: No CSV files found in {DATA_DIR}. Cannot proceed.", file=sys.stderr)
    sys.exit(1)

# --- Process each found CSV file ---
for file_path in csv_files:
    # Extract supplier name from filename (e.g., MRS_Thermo.csv -> MRS)
    filename = os.path.basename(file_path)
    supplier_name = filename.split('_')[0] # Assumes format Supplier_Manufacturer.csv
    print(f"Processing file for supplier: {supplier_name} from {file_path}", file=sys.stderr)
    sys.stderr.flush()
    all_suppliers.add(supplier_name)
    try:
        # Try opening with utf-8 first, then fallback to latin-1 if needed
        try:
            with open(file_path, mode='r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row_raw in reader:
                    row = clean_dict_keys(row_raw)
                    item_no = row.get('PART #')
                    if not item_no:
                        continue

                    # Update product details (only if not already set by another file)
                    if not products_data[item_no]['itemNo']:
                        products_data[item_no]['itemNo'] = item_no
                    if not products_data[item_no]['description']:
                        products_data[item_no]['description'] = row.get('DESCRIPTION', '').strip()
                    # Infer Manufacturer from filename if needed, otherwise use BRAND
                    manufacturer_name = filename.split('_')[1].split('.')[0] if '_' in filename else row.get('BRAND', '').strip()
                    if not products_data[item_no]['manufacturer']:
                        products_data[item_no]['manufacturer'] = manufacturer_name
                    if not products_data[item_no]['brand']:
                        products_data[item_no]['brand'] = row.get('BRAND', '').strip()
                    if not products_data[item_no]['size']:
                         products_data[item_no]['size'] = row.get('UOM', '').strip()

                    # Add supplier offer with currency conversion
                    original_price_str = row.get('PRICE')
                    original_price = parse_price(original_price_str)
                    original_currency = row.get('CURRENCY', 'USD').strip()
                    usd_price = convert_to_usd(original_price, original_currency)

                    offer = {
                        'supplierName': supplier_name,
                        'price': usd_price, # Store the converted USD price
                        'currency': 'USD', # Always store USD in the database offer
                        'catalogNo': row.get('CATALOG #', item_no).strip(), # Use PART # if CATALOG # missing
                        # Optionally store original price/currency if needed for display
                        # 'originalPrice': original_price,
                        # 'originalCurrency': original_currency
                    }
                    products_data[item_no]['supplierOffers'].append(offer)

        except UnicodeDecodeError:
            print(f"UTF-8 decoding failed for {file_path}, trying latin-1...", file=sys.stderr)
            sys.stderr.flush()
            with open(file_path, mode='r', newline='', encoding='latin-1') as csvfile:
                reader = csv.DictReader(csvfile)
                for row_raw in reader:
                    row = clean_dict_keys(row_raw)
                    item_no = row.get('PART #')
                    if not item_no:
                        continue
                    # Update product details
                    if not products_data[item_no]['itemNo']:
                        products_data[item_no]['itemNo'] = item_no
                    if not products_data[item_no]['description']:
                        products_data[item_no]['description'] = row.get('DESCRIPTION', '').strip()
                    manufacturer_name = filename.split('_')[1].split('.')[0] if '_' in filename else row.get('BRAND', '').strip()
                    if not products_data[item_no]['manufacturer']:
                        products_data[item_no]['manufacturer'] = manufacturer_name
                    if not products_data[item_no]['brand']:
                        products_data[item_no]['brand'] = row.get('BRAND', '').strip()
                    if not products_data[item_no]['size']:
                         products_data[item_no]['size'] = row.get('UOM', '').strip()

                    # Add supplier offer with currency conversion
                    original_price_str = row.get('PRICE')
                    original_price = parse_price(original_price_str)
                    original_currency = row.get('CURRENCY', 'USD').strip()
                    usd_price = convert_to_usd(original_price, original_currency)

                    offer = {
                        'supplierName': supplier_name,
                        'price': usd_price, # Store the converted USD price
                        'currency': 'USD', # Always store USD in the database offer
                        'catalogNo': row.get('CATALOG #', item_no).strip(),
                    }
                    products_data[item_no]['supplierOffers'].append(offer)

    except FileNotFoundError:
        print(f"ERROR: File not found: {file_path}. Skipping supplier {supplier_name}.", file=sys.stderr)
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while processing {file_path}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
    sys.stderr.flush()

# Convert defaultdict to list for JSON output
final_product_list = list(products_data.values())
final_supplier_list = list(all_suppliers)

print(f"Processed {len(final_product_list)} unique products.", file=sys.stderr)
print(f"Found {len(final_supplier_list)} unique suppliers: {final_supplier_list}", file=sys.stderr)
sys.stderr.flush()

# --- Output JSON strings to standard output, separated by delimiter ---
try:
    suppliers_json_str = json.dumps(final_supplier_list, indent=None) # No indent for stdout
    products_json_str = json.dumps(final_product_list, indent=None) # No indent for stdout

    # Print suppliers JSON, delimiter, then products JSON to stdout
    print(suppliers_json_str)
    print(JSON_DELIMITER)
    print(products_json_str)
    sys.stdout.flush() # Ensure output is flushed

    print("CSV to JSON conversion finished. JSON output sent to stdout.", file=sys.stderr)
    sys.stderr.flush()

except Exception as e:
    print(f"ERROR: Failed to generate or print JSON output: {e}", file=sys.stderr)
    sys.stderr.flush()
    sys.exit(1)

