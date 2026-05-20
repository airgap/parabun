import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { sprites } from './sprites.js';

var root = $.from_html(`<div><svg width="13" height="14" aria-hidden="true"><use></use></svg></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);
	$.init();

	var div = root();
	var svg = $.child(div);
	var use = $.child(svg);

	$.reset(svg);
	$.reset(div);
	$.template_effect(() => $.set_xlink_attribute(use, 'xlink:href', `${($.deep_read_state(sprites), $.untrack(() => sprites['a'])) ?? ''}#done`));
	$.append($$anchor, div);
	$.pop();
}