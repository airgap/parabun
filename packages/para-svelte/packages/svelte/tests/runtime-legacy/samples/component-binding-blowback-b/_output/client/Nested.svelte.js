import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

var root = $.from_html(`<li><!></li>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12);
	let id = $.prop($$props, 'id', 12);

	const initialValues = {
		'id-0': 'zero',
		'id-1': 'one',
		'id-2': 'two',
		'id-3': 'three'
	};

	onMount(() => {
		value(initialValues[id()]);
	});

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get id() {
			return id();
		},

		set id($$value) {
			id($$value);
			$.flush();
		}
	};

	$.init();

	var li = root();
	var node = $.child(li);

	$.slot(node, $$props, 'default', {}, null);
	$.reset(li);
	$.append($$anchor, li);

	return $.pop($$exports);
}