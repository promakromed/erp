#!/usr/bin/env python3
import csv
import json
import os
from collections import defaultdict

# --- Determine the script's directory and set relative paths ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, 'data') # Assumes 'data' directory is in the same dir as the script

# Configuration using relative paths
OUTPUT_SUPPLIERS_FILE = os.path.join(DATA_DIR, 'suppliers.json')
OUTPUT_PRODUCTS_FILE = os.path.join(DATA_DIR, 'products_new_format.json')
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

print("Starting CSV processing...")

# Ensure data directory exists before writing
os.makedirs(DATA_DIR, exist_ok=True)

for supplier_name, file_path in SUPPLIER_FILES.items():
    print(f"Processing file for supplier: {supplier_name} from {file_path}")
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
                        print(f"WARNING: Skipping row due to missing 'PART #' in {supplier_name} file: {row_raw}")
                        continue

                    # Update product details (use first non-empty value found)
                    if not products_data[item_no]['itemNo']:
                        products_data[item_no]['itemNo'] = item_no
                    if not products_data[item_no]['description']:
                        products_data[item_no]['description'] = row.get('DESCRIPTION', '').strip()
                    if not products_data[item_no]['manufacturer']:
                        products_data[item_no]['manufacturer'] = row.get('BRAND', '').strip() # Assuming BRAND maps to manufacturer
                    if not products_data[item_no]['brand']:
                        products_data[item_no]['brand'] = row.get('BRAND', '').strip()
                    if not products_data[item_no]['size']:
                         products_data[item_no]['size'] = row.get('UOM', '').strip() # Assuming UOM maps to size

                    # Add supplier offer
                    price_str = row.get('PRICE')
                    price = parse_price(price_str)
                    if price == 0.0 and price_str: # Log warning if original price wasn't empty/zero but parsing failed
                         print(f"WARNING: Invalid price format '{price_str}' for item {item_no} from {supplier_name}. Parsed as 0.0.")

                    offer = {
                        'supplierName': supplier_name,
                        'price': price,
                        'currency': row.get('CURRENCY', 'USD').strip(),
                        'catalogNo': row.get('CATALOG #', '').strip(),
                    }
                    products_data[item_no]['supplierOffers'].append(offer)

        except UnicodeDecodeError:
            print(f"UTF-8 decoding failed for {file_path}, trying latin-1...")
            with open(file_path, mode='r', newline='', encoding='latin-1') as csvfile:
                reader = csv.DictReader(csvfile)
                # Duplicate the processing logic for latin-1 encoding
                for row_raw in reader:
                    row = clean_dict_keys(row_raw)
                    item_no = row.get('PART #')
                    if not item_no:
                        print(f"WARNING: Skipping row due to missing 'PART #' in {supplier_name} file (latin-1): {row_raw}")
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
                    if price == 0.0 and price_str:
                         print(f"WARNING: Invalid price format '{price_str}' for item {item_no} from {supplier_name} (latin-1). Parsed as 0.0.")

                    offer = {
                        'supplierName': supplier_name,
                        'price': price,
                        'currency': row.get('CURRENCY', 'USD').strip(),
                        'catalogNo': row.get('CATALOG #', '').strip(),
                    }
                    products_data[item_no]['supplierOffers'].append(offer)

    except FileNotFoundError:
        print(f"ERROR: File not found: {file_path}. Skipping supplier {supplier_name}.")
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while processing {file_path}: {e}")

# Convert defaultdict to list for JSON output
final_product_list = list(products_data.values())
final_supplier_list = list(all_suppliers)

print(f"Processed {len(final_product_list)} unique products.")
print(f"Found {len(final_supplier_list)} unique suppliers: {final_supplier_list}")

# Write suppliers JSON
try:
    with open(OUTPUT_SUPPLIERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_supplier_list, f, indent=2)
    print(f"Successfully wrote suppliers list to {OUTPUT_SUPPLIERS_FILE}")
except Exception as e:
    print(f"ERROR: Failed to write suppliers JSON file: {e}")

# Write products JSON
try:
    with open(OUTPUT_PRODUCTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_product_list, f, indent=2)
    print(f"Successfully wrote product data to {OUTPUT_PRODUCTS_FILE}")
except Exception as e:
    print(f"ERROR: Failed to write products JSON file: {e}")

print("CSV to JSON conversion finished.")

