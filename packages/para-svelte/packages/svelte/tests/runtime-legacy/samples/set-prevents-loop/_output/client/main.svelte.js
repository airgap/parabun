import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12, true);
	let answer = $.prop($$props, 'answer', 12, 42);

	var $$exports = {
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		},

		get answer() {
			return answer();
		},

		set answer($$value) {
			answer($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			Foo($$anchor, {
				get answer() {
					return answer();
				},

				set answer($$value) {
					answer($$value);
				},
				$$legacy: true
			});
		};

		var alternate = ($$anchor) => {
			Foo($$anchor, {
				get answer() {
					return answer();
				},

				set answer($$value) {
					answer($$value);
				},
				$$legacy: true
			});
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}