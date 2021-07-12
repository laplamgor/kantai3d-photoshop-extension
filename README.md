[⬅️ back to top repo](https://github.com/laplamgor/kantai3d)

Other Languages: [繁體中文](https://github.com/laplamgor/kantai3d-photoshop-extension/blob/master/README.zh-Hant.md)

As of 2021 July, this extension is no longer maintained. Focus will be moved to [a web-based sculpting tool](https://github.com/laplamgor/kantai3d-online-editor).

The new tool is completely standalone and free, also more intuitive to use.

# Depth Preview (Deprecated)
Depth Preview is an extension for Adobe Photoshop CC to preview parallax occlusion mapping effect when editing a depth map. The parallax occlusion mapping effect is exactly same as Kantai 3D Kancolle Mod.


## Table of Contents
1. [Requirement](#requirement)
2. [How to install](#how-to-install)
3. [Depth map file requirement](#depth-map-file-requirement)
4. [How to draw depth map](#how-to-draw-depth-map)

## Requirement
- Adobe Photoshop CC 2020 or newer
- [Anastasiy’s extension manager](https://install.anastasiy.com/)
- [The ZXP file of the latest release](https://github.com/laplamgor/kantai3d-photoshop-extension/releases)


## How to install
### Download and unzip Anastasiy’s extension manager
Anastasiy’s extension manager is a third-party developed tool for installing extensions packaged in .zxp format.
Make sure you have fully unzipped the extension manager to your chosen directory.
Open ExtensionManager.exe if you are using Windows PC.

![extension-manager-1](https://user-images.githubusercontent.com/11514317/79686712-ff581000-8274-11ea-980b-a54fb0a0410e.png)

### Install the extension
Simply select Photoshop 2020 or newer on the left area.

Then, drag the ZXP file from your file system into the Extension area of Anastasiy’s extension manager

![extension-manager-2png](https://user-images.githubusercontent.com/11514317/79686714-0121d380-8275-11ea-926b-b94163c64cb5.png)

### Open the Depth Preview window in Photoshop
You can now open Photoshop. Please reopen it if your Photoshop is opened during the installation of the extension.

In the title bar, select **Window** -> **Extension** -> **Depth Preview** to show the window

![photoshop-1](https://user-images.githubusercontent.com/11514317/79686807-ab016000-8275-11ea-8dec-356634d3eed9.png)

When it's opened, it should look like this without any base texture and depth data.

![photoshop-2](https://user-images.githubusercontent.com/11514317/79686808-ac328d00-8275-11ea-8e8c-febde0096222.png)

It's done! You can freely resize and rearrange the window just like any other panel in Photoshop.


## Depth map file requirement

### File name
To preview parallax occlusion mapping effect, you need two files in the same working directory:
- A PSD file that with namne suffix `_depth` and containing the depth map
- A PNG file that without suffix `_depth` and containing basic texture

Below is an example of the file names:

![0464_5596_mqlroxfnufpz_depth](https://user-images.githubusercontent.com/11514317/79690104-55d04900-828b-11ea-8b8a-7127de08510d.png)

### File dimension
The two files must have the exact same dimension.

### Depth map specification

There are many different standards outside to represent depth data in an image.
Depth Preview represents Kantai 3D represent in the following standard:
- The depth map is a grayscale image
- sRGB middle gray (#808080) is the original depth (i.e. zero parallax offset)
- Any pixel brighter than sRGB middle gray is considered closer to the camera
- Any pixel darker than sRGB middle gray is considered farer away from the camera
- The depth scale is linear (i.e. depth distance between #888888 vs #808080 and #080808 vs #000000 are the same)

## How to draw depth map
There is not enough space and time to include all depth map drawing tutuorials and tips here.
For more example, please refer to the Kantai 3D depth map repository.
