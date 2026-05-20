import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let attack = $.prop($$props, 'attack', 12, '" onload="alert(\'uhoh\')" data-nothing="not important');

	var $$exports = {
		get attack() {
			return attack();
		},

		set attack($$value) {
			attack($$value);
			$.flush();
		}
	};

	var div = root();
	let styles;

	$.template_effect(() => styles = $.set_style(div, '', styles, { '--css-variable': attack() }));
	$.append($$anchor, div);

	return $.pop($$exports);
}