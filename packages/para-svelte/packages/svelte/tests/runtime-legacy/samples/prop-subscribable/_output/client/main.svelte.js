import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $b = () => $.store_get(b(), '$b', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let a = $.prop($$props, 'a', 12);
	let b = $.prop($$props, 'b', 12);
	let c = $.prop($$props, 'c', 12);

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
		},

		get c() {
			return c();
		},

		set c($$value) {
			c($$value);
			$.flush();
		}
	};

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, $b()));
	$.append($$anchor, text);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}