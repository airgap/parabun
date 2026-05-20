import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Slider from './Slider.svelte';

var root = $.from_html(`<svelte-css-wrapper style="display: contents"><!></svelte-css-wrapper> <svelte-css-wrapper style="display: contents"><!></svelte-css-wrapper>`, 1);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let railColor1 = $.prop($$props, 'railColor1', 12);
	let railColor2 = $.prop($$props, 'railColor2', 12);
	let trackColor1 = $.prop($$props, 'trackColor1', 12);
	let trackColor2 = $.prop($$props, 'trackColor2', 12);

	function identity(color) {
		return color;
	}

	var $$exports = {
		get railColor1() {
			return railColor1();
		},

		set railColor1($$value) {
			railColor1($$value);
			$.flush();
		},

		get railColor2() {
			return railColor2();
		},

		set railColor2($$value) {
			railColor2($$value);
			$.flush();
		},

		get trackColor1() {
			return trackColor1();
		},

		set trackColor1($$value) {
			trackColor1($$value);
			$.flush();
		},

		get trackColor2() {
			return trackColor2();
		},

		set trackColor2($$value) {
			trackColor2($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	{
		$.css_props(node, () => ({ '--rail-color': railColor1(), '--track-color': trackColor1() }));
		Slider(node.lastChild, { id: 'slider-1' });
		$.reset(node);
	}

	var node_1 = $.sibling(node, 2);

	{
		let $0 = $.derived_safe_equal(() => (
			$.deep_read_state(trackColor2()),
			$.untrack(() => identity(trackColor2()))
		));

		$.css_props(node_1, () => ({ '--rail-color': railColor2(), '--track-color': $.get($0) }));
		Slider(node_1.lastChild, { id: 'slider-2' });
		$.reset(node_1);
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}