import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Thing from './Thing.svelte';

var root_1 = $.from_html(`<div><!> <p>text</p></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);
	let empty = $.prop($$props, 'empty', 12);

	var $$exports = {
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		},

		get empty() {
			return empty();
		},

		set empty($$value) {
			empty($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root_1();
			var node_1 = $.child(div);

			$.each(node_1, 1, empty, $.index, ($$anchor, thing) => {
				Thing($$anchor, {
					get thing() {
						return $.get(thing);
					}
				});
			});

			$.next(2);
			$.reset(div);
			$.append($$anchor, div);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}