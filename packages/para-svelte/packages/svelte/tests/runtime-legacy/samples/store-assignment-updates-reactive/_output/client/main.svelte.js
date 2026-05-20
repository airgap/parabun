import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<p> </p> <p> </p> <p> </p> <button>+1</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $a = () => $.store_get(a, '$a', $$stores);
	const $b = () => $.store_get(b, '$b', $$stores);
	const $c = () => $.store_get(c(), '$c', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const a = writable();
	const b = writable();
	let c = $.prop($$props, 'c', 12);

	function increment() {
		$.store_set(c(), $c() + 1);
	}

	$.legacy_pre_effect(() => ($c()), () => {
		$.store_set(b, $c());
	});

	$.legacy_pre_effect(() => ($b()), () => {
		$.store_set(a, $b());
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get c() {
			return c();
		},

		set c($$value) {
			c($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);

	var p_2 = $.sibling(p_1, 2);
	var text_2 = $.child(p_2);

	$.reset(p_2);

	var button = $.sibling(p_2, 2);

	$.template_effect(() => {
		$.set_text(text, `a: ${$a() ?? ''}`);
		$.set_text(text_1, `b: ${$b() ?? ''}`);
		$.set_text(text_2, `c: ${$c() ?? ''}`);
	});

	$.event('click', button, increment);
	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}