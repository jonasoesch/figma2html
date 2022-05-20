import { Extension, Size, FileType } from "./types";

export const camelize = (str: string): string => {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
    return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
  }).replace(/\s+/g, "");
};

export const dashify = (str: string): string => {
  return str.replace(/\s+/g, '-').toLowerCase();
}

export const forEach = (arr, cb) => {
  for (var i = 0, n = arr.length; i < n; i++) {
    cb(arr[i], i);
  }
}

export const buildExportSettings = (config: {
  extension: Extension,
  constraint: string,
  srcSize: Size,
}): { settings: ExportSettings; destSize?: Size } => {
  const {
    extension,
    constraint,
    srcSize,
  } = config;

  if (constraint.endsWith("x")) {
    const value = Number(constraint.slice(0, -1));
    return {
      settings: {
        format: extension,
        constraint: { type: "SCALE", value },
      },
      destSize: {
        width: srcSize.width * value,
        height: srcSize.height * value,
      },
    };
  } else if (constraint.endsWith("w")) {
    const value = Number(constraint.slice(0, -1));
    return {
      settings: {
        format: extension,
        constraint: { type: "WIDTH", value },
      },
      destSize: {
        width: value,
        height: srcSize.height * (value / srcSize.width),
      },
    };
  } else if (constraint.endsWith("h")) {
    const value = Number(constraint.slice(0, -1));
    return {
      settings: {
        format: extension,
        constraint: { type: "HEIGHT", value },
      },
      destSize: {
        width: srcSize.width * (value / srcSize.height),
        height: value,
      },
    };
  } else {
    return {
      settings: {
        format: extension,
      },
      destSize: srcSize,
    };
  }
};

export const log = (...args: any[]) => {
  console.log('[figma2html]', ...args);
};

export const zeroPad = (val, digits) => {
  var str = String(val);
  while (str.length < digits) str = '0' + str;
  return str;
}

export const getDateTimeStamp = () => {
  var d = new Date();
  var year = d.getFullYear();
  var date = zeroPad(d.getDate(), 2);
  var month = zeroPad(d.getMonth() + 1, 2);
  var hour = zeroPad(d.getHours(), 2);
  var min = zeroPad(d.getMinutes(), 2);
  return year + '-' + month + '-' + date + ' ' + hour + ':' + min;
}

// Wrap content HTML in a <div>, add styles and resizer script, write to a file
// export const generateOutputHtml = (content, pageName, settings)  => {
export const generateOutputSvelte = () => {
  let commentBlock =
    '<!-- Generated by figma2html on ' +
    getDateTimeStamp() +
    ' -->\r';


  let content = `
    ${commentBlock}
    <script></script>
    <h1>Hello world</h1>
    <style>
    </style>
  `

  return content;
}

export const generateOutputHtml = (config, assets) => {
  let containerId = `${config.syntax}-box`;
  let linkSrc = config.clickableLink || '';
  let resizerJs = config.includeResizer ? getResizerScript(containerId) : "";
  let widthRange = getWidthRange(assets);
  let html, js, css;

  let startComment =
    `<!-- Generated by figma2html on ${getDateTimeStamp()} -->\r`,
    endComment = `<!-- End figma2html generated content - ${getDateTimeStamp()} -->\r`;

  html = `<div id="${containerId}" class="figma2html">`;

  if (linkSrc) html += `\t<a class="f2hLink" href="${linkSrc}">\r`;

  assets.forEach(asset => {
    html += forEachFrame(asset, widthRange, config);
  });

  html += `</div>`;

  if (linkSrc) html += `\t</a>\r`;

  css = `
    <style lang="postcss">\r
      \t\t${generatePageCss(containerId, config)}
    </style>
  `

  js = resizerJs;

  let content = `
    ${startComment}
    \r
    ${html}
    \r
    ${css}
    \r
    ${js}
    \r
    ${endComment}
  `;

  return content;
}

export const forEachFrame = (asset, widthRange, config) => {
  let frame = asset.node;
  let frameId = frame.id;
  let frameClass = `g-${frameId}`;
  let imgName = asset.filename;
  let textFrames, textData;
  let altText = config.altText;
  // let frameWidth = frame.width;
  let frameWidth = +frame.name.replace("#", "").replace("px", "");
  let frameHeight = frame.height;
  let frameContent = { html: '', css: '', js: '' };

  // set layout mode to none
  frame.layoutMode = "NONE";
  frame.clipsContent = true;

  // find all frame nodes within the frame
  let allNodes = frame.findAll(node => node.type === "FRAME");

  // convert all frames to groups for positioning
  const groups: GroupNode[] = createGroupsFromFrames(allNodes);

  let textNodes = frame.findAll(child => child.type === 'TEXT');

  textFrames = frame.findAll(child => child.type === 'TEXT');
  textData = convertTextFrames(textFrames, frameWidth, frameHeight);

  frameContent.html += `
  \r\t <!-- Frame: ${imgName.replace(`${config.imagePath}/`, "")} --> \r
  ${generateFrameDiv(frame, frameId, frameClass, imgName, widthRange, textData, altText, config)}
  `

  frameContent.css += `
  \r\t ${generateFrameCss(frame, frameId)}`

  return `\r
    ${frameContent.html}
  \r`;
}

export const createGroupsFromFrames = (items: ReadonlyArray<SceneNode> | PageNode[]): GroupNode[] => {
  const groups: GroupNode[] = [];
  if (!items.length) return groups;

  for (const node of items) {
    if (typeof (node as any).findAll !== 'function') continue

    const group = createGroupFromFrame(node as FrameNode)
    if (group) {
      groups.push(group);
      if (!node.children.length) node.remove()
    }
  }

  return groups;
}

export const createGroupFromFrame = (frameNode: FrameNode): GroupNode | null => {
  if (!frameNode || !frameNode.parent) return null;
  if (!Array.isArray(frameNode.children) || !frameNode.children.length) return null;

  const parent: any = frameNode.parent;
  if (parent.type === "INSTANCE") return null;

  const group: GroupNode = figma.group(frameNode.children, parent);
  if (frameNode.name) group.name = frameNode.name;

  return group;
}

export const convertTextFrames = (textFrames, frameWidth, frameHeight) => {
  let textData = [];

  let styleProps = ["fontName", "fontSize", "textDecoration", "textCase", "lineHeight", "letterSpacing", "fills", "textStyleId", "fillStyleId", "listOptions", "indentation", "hyperlink"];

  textFrames.forEach(textFrame => {
    let textSegments, textStyleId, textStyleObject, textClass = "";
    let x, y, width, opacity, rotation;

    textSegments = textFrame.getStyledTextSegments(styleProps);
    textStyleId = textFrame.textStyleId;

    if (textStyleId && typeof textStyleId !== 'symbol') {
      textStyleObject = figma.getStyleById(textStyleId);
      textClass = textStyleObject ? dashify(textStyleObject.name.split('/').pop()) : null;
    }

    x = `${(textFrame.x / frameWidth) * 100}%`;
    y = `${(textFrame.y / frameHeight) * 100}%`;
    width = `${textFrame.width}px`;
    opacity = textFrame.opacity;
    rotation = textFrame.rotation * -1;

    textData.push({
      class: textClass,
      segments: textSegments,
      x: x,
      y: y,
      width: width,
      opacity: opacity,
      rotation: rotation,
    });
  });

  return textData;
}

export const generateFrameCss = (frame, frameId) => {
  let id = `#frame-${frameId.replace(":", "-")}`;
  let t3 = `\t`,
    t4 = `${t3}\t`,
    css = ``;

  css += `${t3}${id} {`;
  css += `${t4}position: relative;`;
  css += `${t4}overflow: hidden;`;
  css += `${t4}display: none;`;
  css += `${t3}}\r`;

  return css;
}

export const generatePageCss = (containerId, config) => {
  let css = ``;
  let t2 = `\t\t`, t3 = `\r\t\t\t`, t4 = `\t\t\t\t`;
  let blockStart = `${t2}#${containerId} `;
  let blockEnd = `\r ${t2} }\r\r`;

  if (config.maxWidth) {
    css += `${blockStart} {`;
    css += `${t3}max-width: ${config.maxWidth}px;`;
    css += blockEnd;
  }
  if (config.centerHtmlOutput) {
    css += `${blockStart} .artboard {`;
    css += `${t3}margin: 0 auto;`;
    css += blockEnd;
  }
  if (config.clickableLink !== '') {
    css += `${blockStart} .f2hLink {`;
    css += `${t3}cursor: pointer;`;
    css += `${t3}display: block;`;
    css += blockEnd;
  }

  // default <p> styles
  css += `${blockStart} p {`;
  css += `${t3} margin:0;`;
  css += blockEnd;

  css += `${blockStart} .frame {`;
  css += `${t3} position:absolute;`;
  css += blockEnd;

  css += `${blockStart} .f2hImg {`;
  // css += `${t3} position:absolute;`;
  css += `${t3} width:100% !important;`;
  css += `${t3} display: block;`;
  css += `${t3} top: 0;`;
  css += blockEnd;

  css += `${blockStart} .f2hSymbol {`;
  css += `${t3} position:absolute;`;
  css += `${t3} box-sizing: border-box;`;
  css += blockEnd;

  css += `${blockStart} .f2hText {\rposition: absolute;\r}\r`;
  css += `${blockStart} body {\margin: 0;\r}\r`;
  return css;
}

export const getWidthRange = (assets) => {
  let widthRange = { min: 0, max: 0, widths: [], ranges: [] }

  assets.forEach(asset => {
    // let width = asset.node.width;
    let width = +asset.node.name.replace("#", "").replace("px", "");
    widthRange.widths.push(width);
  });

  // sort widthRange.widths
  widthRange.widths.sort((a, b) => a - b);

  widthRange.widths.forEach((width, i) => {
    let range = [];
    if (i == 0) {
      range.push(0, widthRange.widths[1] - 1)
    } else if (i < widthRange.widths.length - 1) {
      range.push(widthRange.widths[i], widthRange.widths[i + 1] - 1)
    } else if (i == widthRange.widths.length - 1) {
      range.push(width)
    }
    widthRange.ranges.push(range);
  })

  widthRange.max = Math.max(...widthRange.widths);

  return widthRange;
}

export const generateFrameDiv = (frame, frameId, frameClass, imgName, widthRange, textData, altText, config) => {
  let id = `frame-${frameId.replace(":", "-")}`;
  let className = `${frameClass.replace(":", "-")} frame artboard`;
  // let width = frame.width;
  let width = +frame.name.replace("#", "").replace("px", "");
  let range = widthRange.ranges[widthRange.widths.indexOf(width)];
  let height = frame.height;
  let aspectRatio = width / height;
  let inlineStyle = '';
  let inlineSpacerStyle = '';
  let html = ``;
  let extension = config.extension.toLowerCase();


  // TO DO: fix this
  // inlineSpacerStyle = `padding: 0 0 ${formatCssPct(height, width)} 0; `
  inlineSpacerStyle = `padding: 0 0 0 0; `
  if (width > 0) inlineStyle += `min-width: ${width}px; `;
  if (range[1]) inlineStyle += `max-width: ${range[1]}px;`;

  html += `\t<div id="${id}" class="${className}" style="${inlineStyle}"`;
  html += ` data-aspect-ratio="${roundTo(aspectRatio, 3)}"`;
  html += ` data-min-width="${range[0]}"`;
  if (range[1]) html += ` data-max-width="${range[1]}"`;
  html += `>\r`;
  html += `\t\t<div style="${inlineSpacerStyle}" class="spacer"></div>\r`;
  html += `\t\t
    <picture>
    \t\t<source srcset="${imgName}.${extension}" type="image/${extension}">
    \t\t<img id="img-${id}" class="f2hImg" alt="${altText}" data-src="${imgName}.${extension}" src="data:image/gif;base64,R0lGODlhCgAKAIAAAB8fHwAAACH5BAEAAAAALAAAAAAKAAoAAAIIhI+py+0PYysAOw==" loading="lazy" />
    </picture>
  \r`;

  if (textData) {
    textData.forEach(text => {
      let el = ``;

      let style = `style="`;
      style += `top: ${text.y}; left: ${text.x}; opacity: ${text.opacity}; width: ${text.width};`;

      if (text.rotation !== 0) style += ` transform: rotate(${text.rotation}deg); transform-origin: left top;`;
      style += `"`;

      if (config.applyHtags && (text.class === "h1" || text.class === "h2" || text.class === "h3" || text.class === "h4" || text.class === "h5" || text.class === "h6")) {
        el += `\t\t<${text.class} class="f2hText" ${style}>\r`;
        text.segments.forEach(segment => {
          el += createSpan(segment, config.styleTextSegments);
        });
        el += `\t\t</${text.class}>\r`;
      } else {
        el += `\t\t<p class="f2hText ${config.applyStyleNames ? text.class : ''}" ${style}>\r`;
        text.segments.forEach(segment => {
          el += createSpan(segment, config.styleTextSegments);
        });
        el += `\t\t</p>\r`;
      }

      html += el;

    })
  }


  html += `\t</div>\r`;

  return html;
}

export const createSpan = (segment, applyStyles) => {
  let el = ``;
  let styleProps = ["fontName", "fontSize", "textDecoration", "textCase", "lineHeight", "letterSpacing", "fills", "textStyleId", "fillStyleId", "listOptions", "indentation", "hyperlink"];

  let styleTag = `style="`;

  if (applyStyles) {
    styleProps.forEach(prop => {
      if (segment[prop]) styleTag += convertStyleProp(prop, segment[prop]);
    });
  }

  styleTag += `"`;

  if (segment.hyperlink) el += `\t\t<a href="${segment.hyperlink.value}" target="_blank">`;

  el += `\t\t<span class="f2hsegment" ${styleTag}>${segment.characters}</span>`;

  if (segment.hyperlink) el += `\t\t</a>`;

  return el;
}

export const convertStyleProp = (prop, value) => {
  if (prop === "fontName") return ` font-family: ${value.family}; font-weight: ${value.style === "Bold" || value.style === "Bold Italic" ? "bold" : "normal"}; font-style: ${value.style === "Italic" || value.style === "Bold Italic" ? "italic" : "normal"};`;
  if (prop === "fontSize") return ` font-size: ${value}px;`;
  if (prop === "textDecoration") return ` text-decoration: ${value.toLowerCase()};`;
  if (prop === "textCase") return ` text-transform: ${value === "ORIGINAL" ? "none" : value.toLowerCase()};`;
  if (prop === "lineHeight") return ` line-height: ${value.unit === "AUTO" ? "normal" : value.unit === "PERCENT" && value.value > 0 ? value.value / 100 : value.value + "px"};`;
  if (prop === "letterSpacing") return ` letter-spacing: ${value.unit === "PERCENT" && value.value > 0 ? value.unit / 100 : value.value + "px"};`;
  if (prop === "fills") return ` color: rgba(${value[0].color.r * 255}, ${value[0].color.g * 255}, ${value[0].color.b * 255}, ${value[0].opacity}); mix-blend-mode: ${value[0].blendMode.toLowerCase()};`;
  else return "";
}

export const roundTo = (num, precision) => {
  return Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
}

export const formatCssPct = (height, width) => {
  let pct = height / width * 100;
  return pct.toFixed(2) + '%';
}

export const getResizerScript = (containerId) => {
  // The resizer function is embedded in the HTML page -- external variables must
  // be passed in.

  const resizer = (containerId) => {
    if (!('querySelector' in document)) return;

    const elementInView = (el) => {
      let bounds = el.getBoundingClientRect();

      return bounds.top < window.innerHeight && bounds.bottom > 0;
    }

    const updateImgSrc = (img) => {
      let src = img.getAttribute('data-src');

      if (src && img.getAttribute('src') != src) {
        img.setAttribute('src', src);
      }
    }

    const onIntersectionChange = (entries) => {
      let isIntersecting = entries.reduce(function (memo, entry) {
        return memo || entry.isIntersecting;
      }, false);

      if (isIntersecting) {
        waiting = false;

        update();
      }
    }

    const selectChildren = (selector, parent) => {
      return parent ? Array.prototype.slice.call(parent.querySelectorAll(selector)) : [];
    }

    // based on underscore.js
    const throttle = (func, wait) => {
      let timeout = null,
        previous = 0;

      function run() {
        previous = Date.now();
        timeout = null;
        func();
      }

      return function () {
        let remaining = wait - (Date.now() - previous);

        if (remaining <= 0 || remaining > wait) {
          clearTimeout(timeout);
          run();
        } else if (!timeout) {
          timeout = setTimeout(run, remaining);
        }
      };
    }

    const update = () => {
      let artboards = selectChildren('.' + nameSpace + 'artboard[data-min-width]', container),
        width = Math.round(container.getBoundingClientRect().width);

      // Set artboard visibility based on container width
      artboards.forEach(function (el) {
        let minwidth = el.getAttribute('data-min-width'),
          maxwidth = el.getAttribute('data-max-width');
        if (+minwidth <= width && (+maxwidth >= width || maxwidth === null)) {
          if (!waiting) {
            selectChildren('.' + nameSpace + 'f2hImg', el).forEach(updateImgSrc);
          }
          el.style.display = 'block';
        } else {
          el.style.display = 'none';
        }
      });

      // Initialize lazy loading on first call
      if (waiting && !observer) {
        if (elementInView(container)) {
          waiting = false;
          update();
        } else {
          observer = new IntersectionObserver(onIntersectionChange, {
            rootMargin: '400px 400px'
          });
          observer.observe(container);
        }
      }
    }

    let container = document.getElementById(containerId);

    let nameSpace = '';
    let onResize = throttle(update, 200);
    let waiting = !!window.IntersectionObserver;
    let observer;

    update();

    document.addEventListener('DOMContentLoaded', update);
    window.addEventListener('resize', onResize);


  };

  let optStr = '{namespace: "' + '' + '", setup: window.setupInteractive || window.getComponent}';

  // convert resizer function to JS source code
  let resizerJs =
    '(' +
    trim(resizer.toString().replace(/ {2}/g, '\t')) + // indent with tabs
    ')("' +
    containerId +
    '", ' +
    optStr +
    ');';

  return (
    "<script>\r\t" +
    resizerJs +
    '\r</script>\r'
  );
}

export const trim = (s) => {
  return s.replace(/^[\s\uFEFF\xA0\x03]+|[\s\uFEFF\xA0\x03]+$/g, '');
}

class TempFrame {
  frame: FrameNode | undefined;

  create = () => {
    if (this.frame) {
      this.frame.remove();
      this.frame = undefined;
    }

    this.frame = figma.createFrame();
    this.frame.name = "[figma2html]";
    this.frame.clipsContent = false;
    this.frame = this.frame;
  };

  remove = () => {
    this.frame?.remove();
    this.frame = undefined;
  };
}
const tempFrame = new TempFrame();

export default {};
