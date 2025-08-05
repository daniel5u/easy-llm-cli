import os

def list_directory_contents(path='.'):
    """列出指定目录下的所有文件和文件夹名称"""
    try:
        # 获取目录下的所有文件和文件夹
        items = os.listdir(path)
        # 打印每个项目
        for item in items:
            print(item)
    except FileNotFoundError:
        print(f"目录 {path} 不存在")
    except PermissionError:
        print(f"没有权限访问目录 {path}")

if __name__ == "__main__":
    # 打印当前目录下的所有文件和文件夹
    list_directory_contents()