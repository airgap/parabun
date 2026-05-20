import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let bar = $.prop($$props, 'bar', 12);
	let x = $.prop($$props, 'x', 12);
	let compound = $.prop($$props, 'compound', 12);
	let go = $.prop($$props, 'go', 12);

	var $$exports = {
		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
			$.flush();
		},

		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		},

		get compound() {
			return compound();
		},

		set compound($$value) {
			compound($$value);
			$.flush();
		},

		get go() {
			return go();
		},

		set go($$value) {
			go($$value);
			$.flush();
		}
	};

	$.init();

	var div = root();
	var node = $.child(div);

	{
		let $0 = $.derived_safe_equal(() => 40 + x());

		Widget(node, {
			get foo() {
				return bar();
			},

			get baz() {
				return $.get($0);
			},

			get qux() {
				return `this is a ${compound() ?? ''} string`;
			},

			get quux() {
				return ($.deep_read_state(go()), $.untrack(() => go().deeper));
			}
		});
	}

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}