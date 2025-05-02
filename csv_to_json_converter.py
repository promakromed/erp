import csv
import json
import os
from decimal import Decimal, InvalidOperation

# Define file paths (assuming the script is run from the project root 'erp' directory)
MRS_CSV = os.path.join("data", "MRS_Thermo.csv")
MIZALA_CSV = os.path.join("data", "MIZALA_Thermo.csv")
OUTPUT_JSON = os.path.join("data", "product_data.json")

products = {}

def clean_price(price_str):
    """Removes commas and converts price string to Decimal."""
    if not price_str:
        return None
    try:
        # Remove commas and potential whitespace
        cleaned_str = price_str.replace(",", "").strip()
        return Decimal(cleaned_str)
    except InvalidOperation:
        print(f"Warning: Could not convert price '{price_str}' to Decimal.")
        return None

def process_csv(filename, supplier_name, products_dict):
    """Reads a supplier CSV and updates the products dictionary."""
    print(f"Processing {filename}...")
    try:
        # Use utf-8-sig to handle potential BOM
        with open(filename, mode='r', encoding='utf-8-sig', newline='') as infile:
            reader = csv.DictReader(infile)
            for row_num, row in enumerate(reader, start=2): # start=2 for header row + 1-based index
                # Clean keys by stripping whitespace
                cleaned_row = {key.strip(): value for key, value in row.items() if key is not None}
                
                try:
                    # Access data using cleaned keys
                    part_no = cleaned_row.get('PART #')
                    description = cleaned_row.get('DESCRIPTION')
                    uom = cleaned_row.get('UOM')
                    brand = cleaned_row.get('BRAND')
                    price_str = cleaned_row.get('PRICE')
                    currency = cleaned_row.get('CURRENCY')

                    if not part_no:
                        print(f"Warning: Skipping row {row_num} in {filename} due to missing 'PART #'. Row data: {row}")
                        continue
                    
                    # Strip whitespace from part_no as well, as it's the key
                    part_no = part_no.strip()
                    if not part_no:
                        print(f"Warning: Skipping row {row_num} in {filename} due to empty 'PART #' after stripping. Original row data: {row}")
                        continue

                    price = clean_price(price_str)
                    if price is None:
                         print(f"Warning: Skipping price for item {part_no} in {filename} due to conversion error.")
                         # Decide if you want to skip the supplier entry entirely or add with null price
                         # continue # Option: skip supplier if price is invalid

                    # Use first encountered details as primary, update if missing
                    if part_no not in products_dict:
                        if not description or not uom or not brand:
                             print(f"Warning: Item {part_no} first seen in {filename} but missing description/uom/brand. Using placeholders.")
                        products_dict[part_no] = {
                            'itemNo': part_no,
                            'description': description or '',
                            'size': uom or '', # Map UOM to size
                            'manufacturer': brand or '', # Map BRAND to manufacturer
                            'brand': brand or '', # Map BRAND to brand
                            'suppliers': []
                        }
                    else:
                        # Optionally update missing fields if this file has them
                        if not products_dict[part_no]['description'] and description:
                            products_dict[part_no]['description'] = description
                        if not products_dict[part_no]['size'] and uom:
                            products_dict[part_no]['size'] = uom
                        if not products_dict[part_no]['manufacturer'] and brand:
                            products_dict[part_no]['manufacturer'] = brand
                        if not products_dict[part_no]['brand'] and brand:
                            products_dict[part_no]['brand'] = brand

                    # Add supplier info
                    supplier_info = {
                        'name': supplier_name,
                        # Convert Decimal to float for JSON compatibility, handle None price
                        'price': float(price) if price is not None else None,
                        'currency': currency or '',
                        'catalogNo': part_no # Use part_no as catalogNo for simplicity
                    }
                    products_dict[part_no]['suppliers'].append(supplier_info)

                except KeyError as e:
                    print(f"Error: Missing expected column {e} in {filename}, row {row_num}. Skipping row.")
                except Exception as e:
                    print(f"Error processing row {row_num} in {filename}: {e}. Skipping row.")
                    print(f"Row data: {row}")

    except FileNotFoundError:
        print(f"Error: File not found - {filename}")
    except Exception as e:
        print(f"Error opening or reading {filename}: {e}")

# --- Main Execution ---
if __name__ == "__main__":
    # Ensure the output directory exists
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)

    # Process both CSV files
    process_csv(MRS_CSV, "MRS", products)
    process_csv(MIZALA_CSV, "Mizala", products)

    # Convert the dictionary values to a list for JSON output
    output_data = list(products.values())

    # Write the data to the JSON file
    try:
        with open(OUTPUT_JSON, 'w', encoding='utf-8') as outfile:
            json.dump(output_data, outfile, indent=2)
        print(f"Successfully processed {len(output_data)} products.")
        print(f"Output written to {OUTPUT_JSON}")
    except Exception as e:
        print(f"Error writing JSON output to {OUTPUT_JSON}: {e}")

