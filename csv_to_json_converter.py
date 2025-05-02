#!/usr/bin/env python3
import csv
import json
import os
import sys
from collections import defaultdict

# --- Unique delimiter for separating JSON outputs ---
JSON_DELIMITER = "---JSON_SEPARATOR---"

# --- Determine the script's directory and set relative paths ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, 'data') # Assumes 'data' directory is in the same dir as the script

# Configuration using relative paths
SUPPLIER_FILES = {
    'MRS': os.path.join(DATA_DIR, 'MRS_Thermo.csv'),
    'Mizala': os.path.join(DATA_DIR, 'MIZALA_Thermo.csv') # Corrected filename to uppercase M
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
        return float(price_str.replace(',', ''))
    except (ValueError, TypeError):
        return 0.0 # Return 0.0 if conversion fails

# --- Main processing logic ---
products_data = defaultdict(lambda: {'itemNo': None, 'description': None, 'manufacturer': None, 'brand': None, 'size': None, 'supplierOffers': []})
all_suppliers = set()

# Print status messages to stderr to avoid interfering with stdout JSON
print("Starting CSV processing...", file=sys.stderr)
sys.stderr.flush()

# Ensure data directory exists (still needed to read CSVs)
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

for supplier_name, file_path in SUPPLIER_FILES.items():
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

                    # Update product details
                    if not products_data[item_no]['itemNo']:
                        products_data[item_no]['itemNo'] = item_no
                    if not products_data[item_no]['description']:
                        products_data[item_no]['description'] = row.get('DESCRIPTION', '').strip()
                    if not products_data[item_no]['manufacturer']:
                        products_data[item_no]['manufacturer'] = row.get('BRAND', '').strip()
                    if not products_data[item_no]['brand']:
                        products_data[item_no]['brand'] = row.get('BRAND', '').strip()
                    if not products_data[item_no]['size']:
                         products_data[item_no]['size'] = row.get('UOM', '').strip()

                    # Add supplier offer
                    price_str = row.get('PRICE')
                    price = parse_price(price_str)
                    offer = {
                        'supplierName': supplier_name,
                        'price': price,
                        'currency': row.get('CURRENCY', 'USD').strip(),
                        'catalogNo': row.get('CATALOG #', '').strip(),
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
                    if not products_data[item_no]['manufacturer']:
                        products_data[item_no]['manufacturer'] = row.get('BRAND', '').strip()
                    if not products_data[item_no]['brand']:
                        products_data[item_no]['brand'] = row.get('BRAND', '').strip()
                    if not products_data[item_no]['size']:
                         products_data[item_no]['size'] = row.get('UOM', '').strip()
                    # Add supplier offer
                    price_str = row.get('PRICE')
                    price = parse_price(price_str)
                    offer = {
                        'supplierName': supplier_name,
                        'price': price,
                        'currency': row.get('CURRENCY', 'USD').strip(),
                        'catalogNo': row.get('CATALOG #', '').strip(),
                    }
                    products_data[item_no]['supplierOffers'].append(offer)

    except FileNotFoundError:
        print(f"ERROR: File not found: {file_path}. Skipping supplier {supplier_name}.", file=sys.stderr)
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while processing {file_path}: {e}", file=sys.stderr)
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

