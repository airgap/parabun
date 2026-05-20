import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let list = $.prop($$props, 'list', 12);
	let qux = $.prop($$props, 'qux', 12, 0);

	var $$exports = {
		get list() {
			return list();
		},

		set list($$value) {
			list($$value);
			$.flush();
		},

		get qux() {
			return qux();
		},

		set qux($$value) {
			qux($$value);
			$.flush();
		}
	};

	var div = root();

	$.each(div, 7, list, (item) => item.foo, ($$anchor, item, index) => {
		{
			let $0 = $.derived_safe_equal(() => qux() === $.get(index));

			Widget($$anchor, $.spread_props(() => $.get(item), {
				get qux() {
					return qux();
				},

				get selected() {
					return $.get($0);
				}
			}));
		}
	});

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}