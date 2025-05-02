#!/usr/bin/env python3
import csv
import json
import os
import sys
from decimal import Decimal

def clean_price(price_str):
    """Clean price string by removing commas and converting to float"""
    if not price_str:
        return 0.0
    return float(price_str.replace(',', ''))

def process_csv_files(mrs_file, mizala_file, output_file):
    """Process MRS and Mizala CSV files and create a combined JSON file"""
    products = {}
    
    # Process MRS file
    print(f"Processing MRS file: {mrs_file}")
    with open(mrs_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            item_no = row['PART #']
            if not item_no:
                continue
                
            if item_no not in products:
                products[item_no] = {
                    "itemNo": item_no,
                    "description": row['DESCRIPTION'],
                    "unit": row['UOM'],
                    "manufacturer": row['BRAND'],
                    "brand": row['BRAND'],
                    "suppliers": []
                }
            
            # Add MRS as supplier
            products[item_no]["suppliers"].append({
                "name": "MRS",
                "price": clean_price(row['PRICE']),
                "currency": row['CURRENCY'],
                "catalogNo": item_no
            })
    
    # Process Mizala file
    print(f"Processing Mizala file: {mizala_file}")
    with open(mizala_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            item_no = row['PART #']
            if not item_no:
                continue
                
            if item_no not in products:
                products[item_no] = {
                    "itemNo": item_no,
                    "description": row['DESCRIPTION'],
                    "unit": row['UOM'],
                    "manufacturer": row['BRAND'],
                    "brand": row['BRAND'],
                    "suppliers": []
                }
            
            # Add Mizala as supplier
            products[item_no]["suppliers"].append({
                "name": "Mizala",
                "price": clean_price(row['PRICE']),
                "currency": row['CURRENCY'],
                "catalogNo": item_no
            })
    
    # Convert dictionary to list for final JSON
    product_list = list(products.values())
    
    # Create data directory if it doesn't exist
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Write to JSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(product_list, f, indent=2)
    
    print(f"Successfully created {output_file} with {len(product_list)} products")
    return product_list

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python csv_to_json_converter.py <mrs_csv_file> <mizala_csv_file> [output_json_file]")
        sys.exit(1)
    
    mrs_file = sys.argv[1]
    mizala_file = sys.argv[2]
    output_file = sys.argv[3] if len(sys.argv) > 3 else "data/product_data.json"
    
    process_csv_files(mrs_file, mizala_file, output_file)
