
import sys

def check_balanced(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    pairs = {'{': '}', '[': ']', '(': ')'}
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char in pairs:
                stack.append((char, i+1, j+1))
            elif char in pairs.values():
                if not stack:
                    print(f"Unmatched {char} at line {i+1}, col {j+1}")
                    return False
                top, li, co = stack.pop()
                if pairs[top] != char:
                    print(f"Mismatched {char} at line {i+1}, col {j+1} (matches {top} from line {li}, col {co})")
                    return False
    
    if stack:
        for char, li, co in stack:
            print(f"Unclosed {char} from line {li}, col {co}")
        return False
    
    print("All braces are balanced!")
    return True

if __name__ == "__main__":
    check_balanced(sys.argv[1])
