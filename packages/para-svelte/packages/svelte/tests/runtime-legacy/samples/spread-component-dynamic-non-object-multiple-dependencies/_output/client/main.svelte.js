import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let props = $.prop($$props, 'props', 12);
	let corge = $.prop($$props, 'corge', 12, false);
	let a = $.prop($$props, 'a', 12, 'a');
	let b = $.prop($$props, 'b', 12, 'b');

	var $$exports = {
		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		},

		get corge() {
			return corge();
		},

		set corge($$value) {
			corge($$value);
			$.flush();
		},

		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get b() {
			return b();
		},

		set b($$value) {
			b($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	{
		let $0 = $.derived_safe_equal(() => corge() ? a() : b());

		Widget(node, $.spread_props(
			{
				get corge() {
					return $.get($0);
				}
			},
			props,
			{ qux: 'named' }
		));
	}

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}