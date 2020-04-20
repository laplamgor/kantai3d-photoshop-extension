其他語言：[English](https://github.com/laplamgor/kantai3d-photoshop-extension/blob/master/README.md)

# Depth Preview
Depth Preview是一個Adobe Photoshop CC專用的插件。 可用於繪製深度圖時預覽視差遮蔽映射效果(parallax occlusion mapping)。

插件所顯示的視差遮蔽映射效果與艦隊立體化改修完全一致。

## 目錄
1. [軟件需求](#軟件需求)
2. [安裝方法](#安裝方法)
3. [Depth map file requirement](#depth-map-file-requirement)
4. [How to draw depth map](#how-to-draw-depth-map)

## 軟件需求
- Adobe Photoshop CC 2020或更新版本 (舊版本未經測試)
- [Anastasiy’s extension manager](https://install.anastasiy.com/)
- [本插件的ZXP安裝封包檔](https://github.com/laplamgor/kantai3d-photoshop-extension/releases)


## 安裝方法
### 下載及解壓Anastasiy’s extension manager
Anastasiy’s extension manager是一個第三方的Adobe插件管理器，可以用於快捷安裝以.zxp封包的插件。
請下載並完整解壓Anastasiy’s extension manager到任意目錄。
如果您使用Windows，點ExtensionManager.exe打開插件管理器。

![extension-manager-1](https://user-images.githubusercontent.com/11514317/79686712-ff581000-8274-11ea-980b-a54fb0a0410e.png)

### 安裝插件封包
在插件管理器左邊界面點選Photoshop 2020或更新版本。

然後把已經下載好的zxp封包的拖動到插件管理器的右邊空格

![extension-manager-2png](https://user-images.githubusercontent.com/11514317/79686714-0121d380-8275-11ea-926b-b94163c64cb5.png)

### 打開Depth Preview插件面板
現在打開Photoshop。如果您在安裝插件之前已經打開了，請關閉並重啟Photoshop。

在頂部選單選擇 **視窗** -> **擴展** -> **Depth Preview** 來打開本插件面板。

![photoshop-1](https://user-images.githubusercontent.com/11514317/79686807-ab016000-8275-11ea-8dec-356634d3eed9.png)

打開面板後，沒有深度圖時會顯示成這個樣子。

![photoshop-2](https://user-images.githubusercontent.com/11514317/79686808-ac328d00-8275-11ea-8e8c-febde0096222.png)

完全。您現在可以隨意重新排列、固定或浮動插件面板。


## 深度圖格式

### 檔案名字
若要預覽深度圖的視差遮蔽映射效果，您必須在同一工作目錄下有以下兩種檔案：
- 以`_depth`作名字結尾的PSD檔案，用於儲存繪製的深度圖
- 相同名字但無`_depth`結尾的PNG檔案，用於儲存原立繪貼圖

以下是檔案名字的例子：

![0464_5596_mqlroxfnufpz_depth](https://user-images.githubusercontent.com/11514317/79690104-55d04900-828b-11ea-8b8a-7127de08510d.png)

### 圖像尺寸
原立繪貼圖PNG檔和深度圖PSD檔的長闊尺寸必須一致

### 深度圖規格

由於網絡上的深度圖表達方式都沒有一致的規格，本插件以及艦隊立體化改修所用的深度圖將嚴格使用以下規格：
- 深度圖是灰階的
- sRGB的中間灰(#808080)是原圖深度 (全圖使用單色#808080等同沒有任何視差效果)
- 比sRGB的中間灰越亮的像素就代表距離視點越近
- 比sRGB的中間灰越暗的像素就代表距離視點越遠
- 深度和像素亮度是線度關係 (例如 #888888與#808080之間的視差和 #080808與#000000之間的視差 是同樣厚度的)

## 繪製深度圖
教學待補，請直接使用艦隊立體化改修的深度圖作為示例參考
