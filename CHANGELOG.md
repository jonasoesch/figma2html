# figma2html

## 1.1.1

###

- Auto width frames now fill the available space on the Artboard (b7ea15f706abaa28b3e34a01e99e126d6572c7c7)
- Ensure that the file name starts with a letter. It is also used for CSS classes and for them to be valid, they need to start with a letter. (3ac722c350c9515409b8314203968fa6fa0ea077)
- Added `3x` option for the image export (df89095e495334b902fb2b5c69057e0c2efc7fd7)
- Set defaults based on our use case at NZZ (0c288f7b1458778aac812d00621d0d66652ea5f3, 7cccac26ca8cc4d6c0cc114f64f8593541d590d6)
- Proper font names and weights for nzz.ch (9b07774d4beeae3f513442436ceaf2449db3ea07)
- Calculate the position of a textbox recursively. This is necessary when a textbox is within a child frame. (03553b76feba59b80bd3e05a78409723952b74cd, 3d1ba3d83bb4557d618a97d3485c00000b7e48eb, 35f169d5d9a2ae0bc04a17a91a3c6a3b69f01bd5)
- When storing options to clientStorage, scope them to the current document and page. So each document and page can have their own options. (301a1ee8b0fcb54ef0d2f0ad42124d82c7509833, e4742d369d5dcec9840a88ce438ac32e5f98a9d6, 7f62aee01978f5ad48765de578db55e34e0783ad, 7f62aee01978f5ad48765de578db55e34e0783ad, 5e4a7b4a84692028d38f953fd2cb14e5d2a16405)

- Add a button to publish the graphic directly to Q. It uploads the Zip file and then calls a serverless function. Currently hardcoded to Supabse (9be3c5d7d27db1ae60c5f71a2a27b44d3edb75e4, a06278d98d5ef37b31a33531cdeedec55e33437d, 22168f4c2e30b3fa8ca13732baeb3a6f0da3a302, c3e5893e9b8bf86d4aad2b5db602b2d20ab9330b)

- Fix: Show correct size already on load (c0c53cab6ff9619b9a9ce62bda4bb0c4cf8e8783)

## 1.1.0

### Minor Changes

- Support multi-line variable text ([#100](https://github.com/the-dataface/figma2html/pull/100))

- - Alter `variables` workflows by adding UI panel and making entries async to config block ([#100](https://github.com/the-dataface/figma2html/pull/100))
  - Edit figma2html settings block, grouping together (migration is built in)
  - Update reset/load/save functionality

### Patch Changes

- Fix f2h-variables frame duplication ([#100](https://github.com/the-dataface/figma2html/pull/100))

- Fix Google Fonts family variant detection ([#111](https://github.com/the-dataface/figma2html/pull/111))

## 1.0.3

### Patch Changes

- Fix custom `</script>` ending tag ([#106](https://github.com/the-dataface/figma2html/pull/106))

## 1.0.3-beta

### Patch Changes

- Notify users of malformatted YAML ([#101](https://github.com/the-dataface/figma2html/pull/101))

- Remove duplicate variables frame + fix placement ([#101](https://github.com/the-dataface/figma2html/pull/101))

## 1.0.2-beta

### Patch Changes

- Fix text node visibility issue by recursively checking parent visibility. See [Figma's visible docs](https://www.figma.com/plugin-docs/api/properties/nodes-visible/#remarks) for more info. Added a isNodeVisible utils to perform recursion and isFigma2htmlFrame to check if passed node is a valid figma2html frame. ([#98](https://github.com/the-dataface/figma2html/pull/98))

## 1.0.1-beta

### Patch Changes

- Fix text styling #92. Text styles were broken during a prior refactor, causing `font-family` and `font-size` and other critical styles to not be assigned in the resulting files. ([#94](https://github.com/the-dataface/figma2html/pull/94))

- - Frames that were acting as shapes (ie with fills and strokes) were being converted to groups and thus losing their styling. That’s addressed. ([#96](https://github.com/the-dataface/figma2html/pull/96))
  - Missing font family names and missing segments were causing an error in a specific debugging file. I defaulted those cases to ‘Inter Normal’; should be fixed.
  - `Apply header tags` feature has been removed in favor of a more robust attribute application. Now you can set custom attributes via a typical `key="value"` syntax, with `tag="TAGNAME"` reserved for changing the tag from `p` to the desired entry.
  - Fluid width was stretching images (#86). Fixed in #87 and reflected here, by setting image height to `null` when `Fluid container width` is turned on.
  - Text in components and component instances was not being recognized as text and instead was exporting as part of the image. I’ve made it so the `tempFrame` converts frames (that have text children), auto layouts, and components to groups and detaches instances, which means text nodes are have correct positioning, relative to the base frame.
  - We were still seeing invisible text nodes in the final export. I’ve updated `withModificationsForExport` to just remove those nodes from the `tempFrame`.
  - Text positioning was way off. Converting frames with text children to groups helped with part of that and correcting the artboard height and width fixed the rest... I hope?

## 1.0.1-beta

### Patch Changes

- - Ignore empty text nodes. Previously would error when trying to access textNode.styles, which is false. I could not find a way for the Figma plugin API to ignore empty nodes by default so included safeguards in convertTextFrames.ts. ([#88](https://github.com/the-dataface/figma2html/pull/88))
  - Ensure textNode.textStyleId is not a symbol. Text nodes with mixed styles get a symbol as their style id. I added a conditional to ignore that ID and proceed as if none were found.

## 1.0.0-beta

### Major changes

- Initial beta release ([#84](https://github.com/the-dataface/figma2html/pull/84))
