import pygame
import sys

def play_mp3(file_path):
    # 初始化 pygame 混音器
    pygame.mixer.init()
    
    try:
        # 加载并播放音乐文件
        pygame.mixer.music.load(file_path)
        pygame.mixer.music.play()
        
        # 等待音乐播放完毕
        while pygame.mixer.music.get_busy():
            pygame.time.Clock().tick(10)
    except pygame.error as e:
        print(f"无法播放文件: {e}")
    finally:
        # 退出 pygame
        pygame.mixer.quit()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("使用方法: python music_player.py <mp3文件路径>")
        sys.exit(1)
    
    mp3_file_path = sys.argv[1]
    play_mp3(mp3_file_path)