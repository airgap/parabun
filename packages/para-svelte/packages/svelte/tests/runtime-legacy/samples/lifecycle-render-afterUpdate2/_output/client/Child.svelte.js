import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { beforeUpdate, afterUpdate } from "svelte";

var root = $.from_html(`<p> </p>`);

export default function Child($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);
	let b = $.prop($$props, 'b', 12);

	beforeUpdate(() => {
		console.log('before');
	});

	beforeUpdate(() => {
		console.log(`before ${a()}, ${b()}`);
	});

	afterUpdate(() => {
		console.log('after');
	});

	afterUpdate(() => {
		console.log(`after ${a()}, ${b()}`);
	});

	var $$exports = {
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

	$.init();

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `a: ${a() ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}