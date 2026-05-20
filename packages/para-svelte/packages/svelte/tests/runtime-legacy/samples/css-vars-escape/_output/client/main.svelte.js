import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Sub from './Sub.svelte';

var root = $.from_html(`<svelte-css-wrapper style="display: contents"><!></svelte-css-wrapper>`, 1);

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

	var fragment = root();
	var node = $.first_child(fragment);

	{
		$.css_props(node, () => ({ '--color': attack() }));
		Sub(node.lastChild, {});
		$.reset(node);
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}