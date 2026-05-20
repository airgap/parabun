import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { log } from './log.js';

var root = $.from_html(`<div class="box svelte-erk9l5"></div>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let w = $.mutable_source(0);
	let h = $.mutable_source(0);

	/** @type {HTMLElement} */
	let div = $.mutable_source();

	$.legacy_pre_effect(() => (log, $.get(div), $.get(w), $.get(h)), () => {
		log.push([!!$.get(div), $.get(w), $.get(h)]);
	});

	$.legacy_pre_effect_reset();
	$.init();

	var div_1 = root();

	$.bind_this(div_1, ($$value) => $.set(div, $$value), () => $.get(div));
	$.bind_element_size(div_1, 'clientWidth', ($$value) => $.set(w, $$value));
	$.bind_element_size(div_1, 'clientHeight', ($$value) => $.set(h, $$value));
	$.append($$anchor, div_1);
	$.pop();
}