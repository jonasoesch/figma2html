import yaml from 'js-yaml';

export const convert = (prop, value) => {
	let weightLookup = {
		Thin: 100,
		ExtraLight: 200,
		Light: 300,
		Regular: 400,
		Medium: 500,
		SemiBold: 600,
		Bold: 700,
		ExtraBold: 800,
		Black: 900,
	};

	if (prop === 'fontName') {
		// add font family to array for google fonts
		if (fontList.indexOf(value) < 0) fontList.push(value);

		let family = value.family;
		let weight = value.style === 'Italic' ? weightLookup['Regular'] : weightLookup[value.style.replace(' Italic', '')];
		let style = value.style.includes('Italic') ? 'italic' : 'normal';

		return `font-family: ${family}; font-weight: ${weight}; font-style: ${style};`;
	}

	if (prop === 'fontSize') return ` font-size: ${value}px;`;

	if (prop === 'textDecoration')
		return ` text-decoration: ${value.toLowerCase()};`;

	if (prop === 'textCase')
		return ` text-transform: ${value === 'ORIGINAL' ? 'none' : value.toLowerCase()
			};`;

	if (prop === 'lineHeight')
		return ` line-height: ${value.unit === 'AUTO'
			? 'normal'
			: value.unit === 'PERCENT' && value.value > 0
				? value.value / 100
				: value.value + 'px'
			};`;

	if (prop === 'letterSpacing')
		return ` letter-spacing: ${value.unit === 'PERCENT' && value.value > 0
			? value.unit / 100
			: value.value + 'px'
			};`;

	if (prop === 'fills' && value.length > 0)
		return ` color: rgba(${value[0].color.r * 255}, ${value[0].color.g * 255
			}, ${value[0].color.b * 255}, ${value[0].opacity
			}); mix-blend-mode: ${value[0].blendMode.toLowerCase()};`;
};

export const fontList = [];

export const styles = (segment, props) => {
	let styleString = '',
		stylesObject;

	// convert each prop to a css string
	props.forEach(prop => {
		if (segment[prop]) styleString += convert(prop, segment[prop]);
	});

	// convert the style string to an object
	stylesObject = yaml.load(styleString.replaceAll('; ', '\n').replaceAll('undefined', ''));

	return { styleString, stylesObject };
}

export default { convert, fontList, styles };