import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root_1 = $.from_html(`Resolved: <!>`, 1);
var root_2 = $.from_html(`Rejected: <!>`, 1);
var root_3 = $.from_html(`<p>loading...</p>`);
var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let thePromise = $.prop($$props, 'thePromise', 12);
	let count = $.prop($$props, 'count', 12);

	var $$exports = {
		Component,
		get thePromise() {
			return thePromise();
		},

		set thePromise($$value) {
			thePromise($$value);
			$.flush();
		},

		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	$.await(
		node,
		thePromise,
		($$anchor) => {
			var p = root_3();

			$.append($$anchor, p);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var { value: theValue, Component } = $.get($$source);

				return { theValue, Component };
			});

			var theValue = $.derived_safe_equal(() => $.get($$value).theValue);
			var Component = $.derived_safe_equal(() => $.get($$value).Component);
			var fragment = root_1();
			var node_1 = $.sibling($.first_child(fragment));

			$.component(node_1, () => $.get(Component), ($$anchor, $$component) => {
				$$component($$anchor, {
					get count() {
						return count();
					},

					get value() {
						return $.get(theValue);
					}
				});
			});

			$.append($$anchor, fragment);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var { value: theError, Component } = $.get($$source);

				return { theError, Component };
			});

			var theError = $.derived_safe_equal(() => $.get($$value).theError);
			var Component = $.derived_safe_equal(() => $.get($$value).Component);
			var fragment_1 = root_2();
			var node_2 = $.sibling($.first_child(fragment_1));

			$.component(node_2, () => $.get(Component), ($$anchor, $$component) => {
				$$component($$anchor, {
					get count() {
						return count();
					},

					get value() {
						return $.get(theError);
					}
				});
			});

			$.append($$anchor, fragment_1);
		}
	);

	$.reset(div);
	$.append($$anchor, div);
	$.bind_prop($$props, 'Component', Component);

	return $.pop($$exports);
}