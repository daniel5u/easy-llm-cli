import random

# 电脑随机生成 1~10 的整数
target = random.randint(1, 10)

print("我已经想好了一个1到10之间的数字，你能猜到它是什么吗？")

while True:
    try:
        # 用户输入数字
        guess = int(input("请输入你猜的数字: "))
        
        # 判断用户输入是否正确
        if guess < target:
            print("小了")
        elif guess > target:
            print("大了")
        else:
            print("猜对了")
            break
    except ValueError:
        print("请输入一个有效的整数！")