import json

logfile = r"C:\Users\prana\.gemini\antigravity-ide\brain\937954b5-242d-4d8b-87aa-b5328374e836\.system_generated\logs\transcript.jsonl"

unique_types = set()
with open(logfile, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            unique_types.add(data.get("type"))
            
            content = str(data)
            if "console" in content.lower() and "error" in content.lower() and "crashed" in content.lower():
                print(f"Match found. Type: {data.get('type')}")
                # print first 500 chars
                print(str(data)[:500])
                print("-" * 50)
        except:
            pass

print("Unique types in transcript.jsonl:", unique_types)
