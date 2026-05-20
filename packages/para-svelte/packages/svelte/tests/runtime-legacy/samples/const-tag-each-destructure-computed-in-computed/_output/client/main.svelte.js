import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let boxes = $.prop($$props, 'boxes', 28, () => [
		{ length: 2, width: 3, height: 4 },
		{ length: 9, width: 5, height: 7 },
		{ length: 10, width: 6, height: 8 }
	]);

	function calculate(length, width, height) {
		return {
			twoDimensions: {
				bottomArea: length * width,
				sideArea1: width * height,
				sideArea2: length * height
			},
			threeDimensions: { volume: length * width * height }
		};
	}

	let dimension = $.prop($$props, 'dimension', 12, 'Dimensions');

	function changeDimension() {
		dimension('DIMENSIONS');
	}

	let area = 'Area';
	let th = 'th';

	var $$exports = {
		get boxes() {
			return boxes();
		},

		set boxes($$value) {
			boxes($$value);
			$.flush();
		},

		get dimension() {
			return dimension();
		},

		set dimension($$value) {
			dimension($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, boxes, $.index, ($$anchor, $$item) => {
		let length = () => $.get($$item)[`leng${th}`];
		let width = () => $.get($$item)[`wid${th}`];
		let height = () => $.get($$item).height;

		const computed_const = $.derived_safe_equal(() => {
			const {
				[`two${dimension()}`]: areas,
				[`three${dimension()}`]: { volume }
			} = (
				length(),
				width(),
				height(),
				$.untrack(() => calculate(length(), width(), height()))
			);

			return { areas, volume };
		});

		const computed_const_1 = $.derived_safe_equal(() => {
			const {
				i = 1,
				[`bottom${area}`]: bottom,
				[`side${area}${i}`]: sideone,
				[`side${area}${i + 1}`]: sidetwo
			} = $.get(computed_const).areas;

			return { i, bottom, sideone, sidetwo };
		});

		var button = root_1();
		var text = $.child(button);

		$.reset(button);
		$.template_effect(() => $.set_text(text, `${$.get(computed_const_1).bottom ?? ''}, ${$.get(computed_const_1).sideone ?? ''}, ${$.get(computed_const_1).sidetwo ?? ''}, ${$.get(computed_const).volume ?? ''}`));
		$.event('click', button, changeDimension);
		$.append($$anchor, button);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}