import datetime

def chatbot():
    print("你好！我是聊天机器人。")
    while True:
        user_input = input("请输入消息（输入'退出'结束对话）：")
        if user_input == "退出":
            print("再见！")
            break
        elif user_input == "时间":
            current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"当前时间是：{current_time}")
        else:
            print("我不懂")

if __name__ == "__main__":
    chatbot()