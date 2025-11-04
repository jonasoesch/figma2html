export const mapFontFamily = (family: string): string => {
	if (family === 'GT America') {
		return 'NZZ Sans, GT America, sans-serif';
	} else {
		return family;
	}
};

export const mapFontWeight = (weight: number): number => {
	return weight;
};
