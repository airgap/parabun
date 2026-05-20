import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>test</div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);
	let c = $.prop($$props, 'c', 12);
	let d = $.prop($$props, 'd', 12);

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get c() {
			return c();
		},

		set c($$value) {
			c($$value);
			$.flush();
		},

		get d() {
			return d();
		},

		set d($$value) {
			d($$value);
			$.flush();
		}
	};

	var div = root();

	$.attribute_effect(div, () => ({ ...a(), 'data-b': 'b', ...c(), 'data-d': d() }));
	$.append($$anchor, div);

	return $.pop($$exports);
}