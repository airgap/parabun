import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { afterUpdate, beforeUpdate, onMount } from 'svelte';
import order from './order.js';

var root = $.from_html(`<li> </li>`);

export default function Item($$anchor, $$props) {
	$.push($$props, false);

	let index = $.prop($$props, 'index', 12);
	let n = $.prop($$props, 'n', 12);

	function logRender(n) {
		order.push(`${index()}: render ${n}`);

		return index();
	}

	beforeUpdate(() => {
		order.push(`${index()}: beforeUpdate ${n()}`);
	});

	afterUpdate(() => {
		order.push(`${index()}: afterUpdate ${n()}`);
	});

	onMount(() => {
		order.push(`${index()}: onMount ${n()}`);
	});

	var $$exports = {
		get index() {
			return index();
		},

		set index($$value) {
			index($$value);
			$.flush();
		},

		get n() {
			return n();
		},

		set n($$value) {
			n($$value);
			$.flush();
		}
	};

	$.init();

	var li = root();
	var text = $.child(li, true);

	$.reset(li);

	$.template_effect(($0) => $.set_text(text, $0), [
		() => ($.deep_read_state(n()), $.untrack(() => logRender(n())))
	]);

	$.append($$anchor, li);

	return $.pop($$exports);
}