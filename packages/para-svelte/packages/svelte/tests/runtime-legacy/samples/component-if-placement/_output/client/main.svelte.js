import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root = $.from_html(`<span>Before</span> <!> <span>After</span>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let flag = $.prop($$props, 'flag', 12);

	var $$exports = {
		get flag() {
			return flag();
		},

		set flag($$value) {
			flag($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	{
		var consequent = ($$anchor) => {
			Component($$anchor, {});
		};

		var alternate = ($$anchor) => {
			Component($$anchor, {});
		};

		$.if(node, ($$render) => {
			if (flag()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.next(2);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}