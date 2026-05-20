import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Svg from './Svg.svelte';

var root = $.from_svg(`<svg xmlns="http://www.w3.org/2000/svg"><g><!></g><g><!></g></svg>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let rectColor1 = $.prop($$props, 'rectColor1', 12);
	let rectColor2 = $.prop($$props, 'rectColor2', 12);
	let circleColor1 = $.prop($$props, 'circleColor1', 12);
	let circleColor2 = $.prop($$props, 'circleColor2', 12);

	function identity(color) {
		return color;
	}

	var $$exports = {
		get rectColor1() {
			return rectColor1();
		},

		set rectColor1($$value) {
			rectColor1($$value);
			$.flush();
		},

		get rectColor2() {
			return rectColor2();
		},

		set rectColor2($$value) {
			rectColor2($$value);
			$.flush();
		},

		get circleColor1() {
			return circleColor1();
		},

		set circleColor1($$value) {
			circleColor1($$value);
			$.flush();
		},

		get circleColor2() {
			return circleColor2();
		},

		set circleColor2($$value) {
			circleColor2($$value);
			$.flush();
		}
	};

	var svg = root();
	var node = $.child(svg);

	{
		$.css_props(node, () => ({
			'--rect-color': rectColor1(),
			'--circle-color': circleColor1()
		}));

		Svg(node.lastChild, { id: 'svg-1' });
		$.reset(node);
	}

	var node_1 = $.sibling(node);

	{
		let $0 = $.derived_safe_equal(() => (
			$.deep_read_state(circleColor2()),
			$.untrack(() => identity(circleColor2()))
		));

		$.css_props(node_1, () => ({ '--rect-color': rectColor2(), '--circle-color': $.get($0) }));
		Svg(node_1.lastChild, { id: 'svg-2' });
		$.reset(node_1);
	}

	$.reset(svg);
	$.append($$anchor, svg);

	return $.pop($$exports);
}