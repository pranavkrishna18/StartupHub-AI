with open("subagent_response_515.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()
    for idx, line in enumerate(lines[10:45], 11):
        print(f"{idx}: {line.strip()}")
