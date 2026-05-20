import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let obj = $.prop($$props, 'obj', 12);
	let c = $.prop($$props, 'c', 12);
	let d = $.prop($$props, 'd', 12);

	var $$exports = {
		get obj() {
			return obj();
		},

		set obj($$value) {
			obj($$value);
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

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.slot(
		node,
		$$props,
		'default',
		$.spread_props(
			{
				get c() {
					return c();
				},

				get d() {
					return d();
				}
			},
			obj
		),
		null
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}