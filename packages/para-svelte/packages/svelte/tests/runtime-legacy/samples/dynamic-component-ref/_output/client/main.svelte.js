import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let test = $.prop($$props, 'test', 12);

	var $$exports = {
		get test() {
			return test();
		},

		set test($$value) {
			test($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.component(node, () => Foo, ($$anchor, $$component) => {
		$.bind_this($$component($$anchor, { $$legacy: true }), ($$value) => test($$value), () => test());
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}