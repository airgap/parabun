import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import A from './A.svelte';
import { writable } from 'svelte/store';

var root = $.from_html(`<!> <br/> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.mutable_source('x');
	let list_two_a = $.mutable_source('list_two_a');
	let list_two_b = $.mutable_source('list_two_b');
	let y = $.mutable_source(writable('y'));
	let m = $.mutable_source('m');
	let n = $.mutable_source('n');
	let o = $.mutable_source('o');
	let p = $.mutable_source('p');
	let q = $.mutable_source(writable('q'));

	function update() {
		$.set(x, 'XX');
		$.set(list_two_a, 'LIST_TWO_A');
		$.set(list_two_b, 'LIST_TWO_B');
		$.set(y, writable('YY'));
		$.set(m, 'MM');
		$.set(n, 'NN');
		$.set(o, 'OO');
		$.set(p, 'PP');
		$.set(q, writable('QQ'));
	}

	var $$exports = { update };

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	A(node, {});

	var node_1 = $.sibling(node, 4);

	A(node_1, {
		get x() {
			return $.get(x);
		},

		get list_two_a() {
			return $.get(list_two_a);
		},

		get list_two_b() {
			return $.get(list_two_b);
		},

		get y() {
			return $.get(y);
		},

		get m() {
			return $.get(m);
		},

		get n() {
			return $.get(n);
		},

		get o() {
			return $.get(o);
		},

		get p() {
			return $.get(p);
		},

		get q() {
			return $.get(q);
		}
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'update', update);

	return $.pop($$exports);
}