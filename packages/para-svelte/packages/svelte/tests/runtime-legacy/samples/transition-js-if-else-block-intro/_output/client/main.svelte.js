import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div>yes</div>`);
var root_2 = $.from_html(`<div>no</div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let yes = $.prop($$props, 'yes', 12);
	let no = $.prop($$props, 'no', 12);
	let x = $.prop($$props, 'x', 12);

	function foo(node) {
		return {
			duration: 400,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	var $$exports = {
		get yes() {
			return yes();
		},

		set yes($$value) {
			yes($$value);
			$.flush();
		},

		get no() {
			return no();
		},

		set no($$value) {
			no($$value);
			$.flush();
		},

		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.bind_this(div, ($$value) => yes($$value), () => yes());
			$.transition(1, div, () => foo);
			$.append($$anchor, div);
		};

		var alternate = ($$anchor) => {
			var div_1 = root_2();

			$.bind_this(div_1, ($$value) => no($$value), () => no());
			$.transition(5, div_1, () => foo);
			$.append($$anchor, div_1);
		};

		$.if(node_1, ($$render) => {
			if (x()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}