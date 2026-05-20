import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor) {
	let bg = $.mutable_source("red");

	const handle = () => {
		$.set(bg, undefined);
	};

	var div = root();
	let styles;

	$.template_effect(() => styles = $.set_style(div, '', styles, { background: $.get(bg) }));
	$.event('click', div, handle);
	$.append($$anchor, div);
}