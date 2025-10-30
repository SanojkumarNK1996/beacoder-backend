import os
import json
import psycopg2
from datetime import datetime

# ----------------------------
# CONFIGURATION
# ----------------------------
BASE_FOLDER = "java_course_data"  # path containing folders like 1_introduction, 2_java_basics, etc.
START_ID = 1              # starting id for ContentBlocks
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "beacoder",
    "user": "postgres",
    "password": "postgres"
}

# ----------------------------
# LOGGING FUNCTION
# ----------------------------
def log(message):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}")

# ----------------------------
# READ JSON + HTML
# ----------------------------
def load_json(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def load_html(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read().strip()

# ----------------------------
# BUILD SQL DATA JSON STRUCTURE
# ----------------------------
def build_data_json(record, folder_path):
    data_type = record["dataType"]
    data = record["data"]

    if data_type == "notes":
        html_path = os.path.join(folder_path, data)
        html_content = load_html(html_path)
        json_data = {"description": html_content}
    elif data_type == "youtube_video":
        json_data = {"videoUrl": data}
    else:
        json_data = {"data": data}  # fallback

    return json.dumps(json_data)

# ----------------------------
# INSERT INTO DATABASE
# ----------------------------
def insert_content_block(conn, record_id, record, json_data):
    with conn.cursor() as cur:
        sql = """
        INSERT INTO public."ContentBlocks"
        (id, "displayOrder", "dataType", "title", "data", "isActive", "createdAt", "updatedAt", "subtopicId")
        VALUES (%s, %s, %s, %s, %s::jsonb, true, current_timestamp, current_timestamp, %s);
        """

        cur.execute(sql, (
            record_id,
            record["displayOrder"],
            record["dataType"],
            record["title"],
            json_data,
            record["subtopicId"]
        ))

# ----------------------------
# MAIN FUNCTION
# ----------------------------
def main():
    global START_ID

    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False

        log("Connected to database successfully.")
        total_records = 0

        for folder_name in sorted(os.listdir(BASE_FOLDER)):
            folder_path = os.path.join(BASE_FOLDER, folder_name)
            if not os.path.isdir(folder_path):
                continue

            main_json_path = os.path.join(folder_path, "main.json")
            if not os.path.exists(main_json_path):
                log(f"Skipping folder {folder_name}: main.json not found.")
                continue

            log(f"Processing folder: {folder_name}")
            records = load_json(main_json_path)

            for record in records:
                json_data = build_data_json(record, folder_path)
                insert_content_block(conn, START_ID, record, json_data)
                log(f"Inserted record ID {START_ID} ({record['dataType']}: {record['title']})")
                START_ID += 1
                total_records += 1

        conn.commit()
        log(f"✅ Completed successfully. {total_records} records inserted.")

    except Exception as e:
        if conn:
            conn.rollback()
        log(f"❌ Error occurred: {e}")

    finally:
        if conn:
            conn.close()
            log("Database connection closed.")

# ----------------------------
# ENTRY POINT
# ----------------------------
if __name__ == "__main__":
    main()
